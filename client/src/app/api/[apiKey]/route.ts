import { NextRequest } from "next/server";
import { createHash, randomUUID } from "crypto";
import { db } from "@/db";
import { users, agents, apiCalls } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { unlockVaults } from "@/lib/unlock-vault";

// Allow up to 120s — CDR decryption polls for validator partials
export const maxDuration = 120;

// ── In-memory sliding-window rate limiter ────────────────────────

type Window = { minute: number[]; hour: number[]; day: number[] };
const windows = new Map<string, Window>();

function getWindow(userId: string): Window {
  let w = windows.get(userId);
  if (!w) {
    w = { minute: [], hour: [], day: [] };
    windows.set(userId, w);
  }
  return w;
}

function checkRateLimit(
  userId: string,
  limits: { perMinute: number; perHour: number; perDay: number }
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const w = getWindow(userId);
  w.minute = w.minute.filter((t) => t > now - 60_000);
  w.hour   = w.hour.filter((t)   => t > now - 3_600_000);
  w.day    = w.day.filter((t)    => t > now - 86_400_000);

  if (w.minute.length >= limits.perMinute)
    return { allowed: false, retryAfter: Math.ceil((w.minute[0] + 60_000 - now) / 1000) };
  if (w.hour.length >= limits.perHour)
    return { allowed: false, retryAfter: Math.ceil((w.hour[0] + 3_600_000 - now) / 1000) };
  if (w.day.length >= limits.perDay)
    return { allowed: false, retryAfter: Math.ceil((w.day[0] + 86_400_000 - now) / 1000) };

  w.minute.push(now);
  w.hour.push(now);
  w.day.push(now);
  return { allowed: true };
}

// ── Call recorder ────────────────────────────────────────────────

function recordCall(
  userId: string,
  method: string,
  path: string,
  status: number,
  latencyMs: number,
  agentId?: string          // internal agents.id — undefined for GET / failures before agent lookup
) {
  db.insert(apiCalls)
    .values({ id: randomUUID(), userId, agentId: agentId ?? null, path, method, status, latencyMs })
    .catch((err) => console.error("[api-calls] log failed", err));
}

// ── Handler ──────────────────────────────────────────────────────

async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ apiKey: string }> }
): Promise<Response> {
  const start = Date.now();
  const { apiKey } = await params;
  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/[^/]+/, "") || "/";

  // ── Check 1: API key ──────────────────────────────────────────
  if (!apiKey?.startsWith("kr_")) {
    return Response.json({ error: "Invalid API key format" }, { status: 401 });
  }

  const hash = createHash("sha256").update(apiKey).digest("hex");
  const user = await db.query.users.findFirst({
    where: eq(users.apiKeyHash, hash),
    columns: { id: true, rateLimitPerMinute: true, rateLimitPerHour: true, rateLimitPerDay: true },
  });

  if (!user) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  // ── Check 2: rate limit ───────────────────────────────────────
  const { allowed, retryAfter } = checkRateLimit(user.id, {
    perMinute: user.rateLimitPerMinute,
    perHour:   user.rateLimitPerHour,
    perDay:    user.rateLimitPerDay,
  });

  if (!allowed) {
    recordCall(user.id, request.method, subPath, 429, Date.now() - start);
    return Response.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(retryAfter ?? 60) } }
    );
  }

  // ── Checks 3 & 4: body validation (non-GET) ───────────────────
  let resolvedAgentId: string | undefined;

  if (request.method !== "GET" && request.method !== "HEAD") {
    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      recordCall(user.id, request.method, subPath, 400, Date.now() - start);
      return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    // ── Check 3: agentId ───────────────────────────────────────
    const agentKey = body.agentId as string | undefined;
    if (!agentKey) {
      recordCall(user.id, request.method, subPath, 401, Date.now() - start);
      return Response.json({ error: "agentId is required" }, { status: 401 });
    }

    const agent = await db.query.agents.findFirst({
      where: and(eq(agents.agentKey, agentKey), eq(agents.userId, user.id)),
      columns: { id: true, agentKey: true, allowedSecrets: true, status: true },
    });

    if (!agent || agent.status !== "active") {
      recordCall(user.id, request.method, subPath, 401, Date.now() - start);
      return Response.json({ error: "Agent not recognised" }, { status: 401 });
    }

    resolvedAgentId = agent.id; // internal DB id for logging

    // ── Check 4: secretsRequested ─────────────────────────────
    const secretsRequested = body.secretsRequested as string[] | undefined;
    if (!Array.isArray(secretsRequested) || secretsRequested.length === 0) {
      recordCall(user.id, request.method, subPath, 400, Date.now() - start, resolvedAgentId);
      return Response.json({ error: "secretsRequested must be a non-empty array" }, { status: 400 });
    }

    const denied = secretsRequested.filter((s) => !agent.allowedSecrets.includes(s));
    if (denied.length > 0) {
      recordCall(user.id, request.method, subPath, 403, Date.now() - start, resolvedAgentId);
      return Response.json(
        { error: `Secret not allowed for this agent: ${denied.join(", ")}` },
        { status: 403 }
      );
    }

    if (!body.taskRequested || typeof body.taskRequested !== "string") {
      recordCall(user.id, request.method, subPath, 400, Date.now() - start, resolvedAgentId);
      return Response.json({ error: "taskRequested is required" }, { status: 400 });
    }

    // ── Unlock CDR vaults ─────────────────────────────────────
    const unlockResult = await unlockVaults(user.id, agent.agentKey, secretsRequested);

    if (Object.keys(unlockResult.errors).length > 0) {
      recordCall(user.id, request.method, subPath, 502, Date.now() - start, resolvedAgentId);
      return Response.json({ ok: false, errors: unlockResult.errors }, { status: 502 });
    }

    // ── TEE: execute the HTTP task with secrets injected ──────
    const task = body.task as {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: string | null;
    } | undefined;

    // If no task object provided, just confirm unlock (backward compat)
    if (!task) {
      recordCall(user.id, request.method, subPath, 200, Date.now() - start, resolvedAgentId);
      return Response.json({ ok: true, secrets: unlockResult.secrets }, { status: 200 });
    }

    // Inject secrets: replace {{SECRET_NAME}} placeholders in url, headers, body
    function inject(template: string): string {
      return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
        unlockResult.secrets[key] ?? `{{${key}}}`
      );
    }

    const resolvedUrl = inject(task.url);
    const resolvedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(task.headers ?? {})) {
      resolvedHeaders[k] = inject(v);
    }
    const resolvedBody = task.body ? inject(task.body) : undefined;

    // Execute the HTTP request inside the TEE
    let taskResponse: Response;
    try {
      taskResponse = await fetch(resolvedUrl, {
        method: task.method.toUpperCase(),
        headers: resolvedHeaders,
        ...(resolvedBody ? { body: resolvedBody } : {}),
      });
    } catch (err) {
      recordCall(user.id, request.method, subPath, 502, Date.now() - start, resolvedAgentId);
      return Response.json(
        { ok: false, error: `Task HTTP request failed: ${err instanceof Error ? err.message : err}` },
        { status: 502 }
      );
    }

    let taskBody: unknown;
    const contentType = taskResponse.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      taskBody = await taskResponse.json().catch(() => null);
    } else {
      taskBody = await taskResponse.text().catch(() => null);
    }

    console.log("\n╔══ [Keyring TEE] Task Executed ═══════════════════════════");
    console.log(`║  Agent:   ${agentKey.slice(0, 20)}…`);
    console.log(`║  Task:    ${body.taskRequested}`);
    console.log(`║  → ${task.method.toUpperCase()} ${resolvedUrl}`);
    console.log(`║  ← ${taskResponse.status} ${taskResponse.statusText}`);
    console.log("╚══════════════════════════════════════════════════════════\n");

    recordCall(user.id, request.method, subPath, 200, Date.now() - start, resolvedAgentId);
    return Response.json(
      {
        ok: true,
        taskStatus: taskResponse.status,
        taskResponse: taskBody,
      },
      { status: 200 }
    );
  }

  // ── GET: just confirm key is valid ────────────────────────────
  recordCall(user.id, request.method, subPath, 200, Date.now() - start, resolvedAgentId);
  return Response.json({ ok: true, userId: user.id }, { status: 200 });
}

export const GET    = handle;
export const POST   = handle;
export const PUT    = handle;
export const PATCH  = handle;
export const DELETE = handle;
