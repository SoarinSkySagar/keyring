import { NextRequest } from "next/server";
import { createHash, randomUUID } from "crypto";
import { db } from "@/db";
import { users, agents, apiCalls } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { unlockVaults } from "@/lib/unlock-vault";

// Allow up to 300s — CDR decryption can take up to 180s on Pimlico free tier
export const maxDuration = 300;

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

// Awaited before every return — the idle_timeout on the Neon connection is
// 20s, but CDR unlock can take 90s, so a fire-and-forget insert would hit a
// dead connection and be swallowed silently. Awaiting costs <100ms and ensures
// the row lands before the response is sent.
async function recordCall(
  userId: string,
  method: string,
  path: string,
  status: number,
  latencyMs: number,
  agentId?: string
) {
  await db.insert(apiCalls)
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
    await recordCall(user.id, request.method, subPath, 429, Date.now() - start);
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
      await recordCall(user.id, request.method, subPath, 400, Date.now() - start);
      return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    // ── Check 3: agentId ───────────────────────────────────────
    const agentKey = body.agentId as string | undefined;
    if (!agentKey) {
      await recordCall(user.id, request.method, subPath, 401, Date.now() - start);
      return Response.json({ error: "agentId is required" }, { status: 401 });
    }

    const agent = await db.query.agents.findFirst({
      where: and(eq(agents.agentKey, agentKey), eq(agents.userId, user.id)),
      columns: { id: true, agentKey: true, allowedSecrets: true, status: true, policy: true },
    });

    if (!agent || agent.status !== "active") {
      await recordCall(user.id, request.method, subPath, 401, Date.now() - start);
      return Response.json({ error: "Agent not recognised" }, { status: 401 });
    }

    resolvedAgentId = agent.id; // internal DB id for logging

    // ── Check 4: secretsRequested ─────────────────────────────
    const secretsRequested = body.secretsRequested as string[] | undefined;
    if (!Array.isArray(secretsRequested) || secretsRequested.length === 0) {
      await recordCall(user.id, request.method, subPath, 400, Date.now() - start, resolvedAgentId);
      return Response.json({ error: "secretsRequested must be a non-empty array" }, { status: 400 });
    }

    const denied = secretsRequested.filter((s) => !agent.allowedSecrets.includes(s));
    if (denied.length > 0) {
      await recordCall(user.id, request.method, subPath, 403, Date.now() - start, resolvedAgentId);
      return Response.json(
        { error: `Secret not allowed for this agent: ${denied.join(", ")}` },
        { status: 403 }
      );
    }

    // operationRequested: the natural-language description the TEE judge rules
    // on. (taskRequested accepted as a backward-compatible alias.)
    const operationRequested =
      (body.operationRequested as string | undefined) ??
      (body.taskRequested as string | undefined);
    if (!operationRequested || typeof operationRequested !== "string") {
      await recordCall(user.id, request.method, subPath, 400, Date.now() - start, resolvedAgentId);
      return Response.json({ error: "operationRequested is required" }, { status: 400 });
    }

    // ── Unlock CDR vaults ─────────────────────────────────────
    const unlockResult = await unlockVaults(user.id, agent.agentKey, secretsRequested);

    if (Object.keys(unlockResult.errors).length > 0) {
      await recordCall(user.id, request.method, subPath, 502, Date.now() - start, resolvedAgentId);
      return Response.json({ ok: false, errors: unlockResult.errors }, { status: 502 });
    }

    // ── Forward to the TEE worker: judge policy, then execute ──
    const task = body.task as {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: string | null;
    } | undefined;

    // No task object → just confirm unlock (backward compat / debug)
    if (!task) {
      await recordCall(user.id, request.method, subPath, 200, Date.now() - start, resolvedAgentId);
      return Response.json({ ok: true, secrets: unlockResult.secrets }, { status: 200 });
    }

    const teeUrl = process.env.TEE_WORKER_URL;
    if (!teeUrl) {
      await recordCall(user.id, request.method, subPath, 502, Date.now() - start, resolvedAgentId);
      return Response.json({ ok: false, error: "TEE worker not configured" }, { status: 502 });
    }

    // The decrypted secrets are sent to the enclave, which runs the AI policy
    // judge (secrets shown to it only as placeholders) and, if allowed, injects
    // the real values and executes the call — all inside the TEE.
    type TeeResult = {
      allowed: boolean;
      reason: string;
      judgeError?: boolean;
      taskStatus?: number;
      taskResponse?: unknown;
      executionError?: string;
      attestation?: unknown;
    };
    let tee: TeeResult;
    try {
      const teeRes = await fetch(teeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy: agent.policy,
          operationRequested,
          task,
          secrets: unlockResult.secrets,
        }),
      });
      if (!teeRes.ok) {
        const detail = (await teeRes.text().catch(() => "")).slice(0, 300);
        await recordCall(user.id, request.method, subPath, 502, Date.now() - start, resolvedAgentId);
        return Response.json(
          { ok: false, error: `TEE worker error (${teeRes.status})`, detail },
          { status: 502 }
        );
      }
      tee = (await teeRes.json()) as TeeResult;
    } catch (err) {
      await recordCall(user.id, request.method, subPath, 502, Date.now() - start, resolvedAgentId);
      return Response.json(
        { ok: false, error: `TEE worker unreachable: ${err instanceof Error ? err.message : err}` },
        { status: 502 }
      );
    }

    console.log(
      `[Keyring] ${tee.allowed ? "ALLOW" : "DENY"} agent=${agentKey.slice(0, 12)}… ` +
        `op="${operationRequested}" → ${task.method.toUpperCase()} ${task.url}` +
        (tee.judgeError ? " (judge-error)" : "") +
        (tee.executionError ? " (exec-error)" : "")
    );

    // Policy judge could not render a verdict → fail closed (502)
    if (tee.judgeError) {
      await recordCall(user.id, request.method, subPath, 502, Date.now() - start, resolvedAgentId);
      return Response.json({ ok: false, error: `Policy check failed: ${tee.reason}` }, { status: 502 });
    }

    // Policy denied the operation → 403
    if (!tee.allowed) {
      await recordCall(user.id, request.method, subPath, 403, Date.now() - start, resolvedAgentId);
      return Response.json({ ok: false, allowed: false, reason: tee.reason }, { status: 403 });
    }

    // Allowed, but the upstream call itself failed inside the enclave → 502
    if (tee.executionError) {
      await recordCall(user.id, request.method, subPath, 502, Date.now() - start, resolvedAgentId);
      return Response.json(
        { ok: false, allowed: true, reason: tee.reason, error: tee.executionError },
        { status: 502 }
      );
    }

    // Allowed and executed → 200
    await recordCall(user.id, request.method, subPath, 200, Date.now() - start, resolvedAgentId);
    return Response.json(
      {
        ok: true,
        allowed: true,
        reason: tee.reason,
        taskStatus: tee.taskStatus,
        taskResponse: tee.taskResponse,
        attestation: tee.attestation,
      },
      { status: 200 }
    );
  }

  // ── GET: just confirm key is valid ────────────────────────────
  await recordCall(user.id, request.method, subPath, 200, Date.now() - start, resolvedAgentId);
  return Response.json({ ok: true, userId: user.id }, { status: 200 });
}

export const GET    = handle;
export const POST   = handle;
export const PUT    = handle;
export const PATCH  = handle;
export const DELETE = handle;
