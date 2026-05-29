import { NextRequest } from "next/server";
import { createHash, randomUUID } from "crypto";
import { db } from "@/db";
import { users, apiCalls } from "@/db/schema";
import { eq } from "drizzle-orm";

// ── In-memory sliding-window rate limiter ────────────────────────
// Tracks request timestamps per user ID across three windows.
// For production, replace with a Redis-backed store (e.g. Upstash).

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

  const minAgo = now - 60_000;
  const hourAgo = now - 3_600_000;
  const dayAgo = now - 86_400_000;
  w.minute = w.minute.filter((t) => t > minAgo);
  w.hour = w.hour.filter((t) => t > hourAgo);
  w.day = w.day.filter((t) => t > dayAgo);

  if (w.minute.length >= limits.perMinute) {
    return { allowed: false, retryAfter: Math.ceil((w.minute[0] + 60_000 - now) / 1000) };
  }
  if (w.hour.length >= limits.perHour) {
    return { allowed: false, retryAfter: Math.ceil((w.hour[0] + 3_600_000 - now) / 1000) };
  }
  if (w.day.length >= limits.perDay) {
    return { allowed: false, retryAfter: Math.ceil((w.day[0] + 86_400_000 - now) / 1000) };
  }

  w.minute.push(now);
  w.hour.push(now);
  w.day.push(now);
  return { allowed: true };
}

// ── Call recorder ────────────────────────────────────────────────

async function recordCall(
  userId: string,
  method: string,
  path: string,
  status: number,
  latencyMs: number
) {
  // Fire-and-forget: don't let logging failures affect the response
  db.insert(apiCalls)
    .values({ id: randomUUID(), userId, path, method, status, latencyMs })
    .catch((err) => console.error("[api-calls] log failed", err));
}

// ── Handler ──────────────────────────────────────────────────────

async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ apiKey: string }> }
): Promise<Response> {
  const start = Date.now();
  const { apiKey } = await params;

  // Reconstruct the sub-path (everything after /api/<key>)
  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api\/[^/]+/, "") || "/";

  if (!apiKey?.startsWith("kr_")) {
    return Response.json({ error: "Invalid API key format" }, { status: 401 });
  }

  const hash = createHash("sha256").update(apiKey).digest("hex");

  const user = await db.query.users.findFirst({
    where: eq(users.apiKeyHash, hash),
    columns: {
      id: true,
      rateLimitPerMinute: true,
      rateLimitPerHour: true,
      rateLimitPerDay: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { allowed, retryAfter } = checkRateLimit(user.id, {
    perMinute: user.rateLimitPerMinute,
    perHour: user.rateLimitPerHour,
    perDay: user.rateLimitPerDay,
  });

  if (!allowed) {
    await recordCall(user.id, request.method, subPath, 429, Date.now() - start);
    return Response.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter ?? 60),
          "X-RateLimit-Limit-Minute": String(user.rateLimitPerMinute),
          "X-RateLimit-Limit-Hour": String(user.rateLimitPerHour),
          "X-RateLimit-Limit-Day": String(user.rateLimitPerDay),
        },
      }
    );
  }

  const latency = Date.now() - start;
  await recordCall(user.id, request.method, subPath, 200, latency);

  return Response.json(
    { ok: true, userId: user.id },
    {
      status: 200,
      headers: {
        "X-RateLimit-Limit-Minute": String(user.rateLimitPerMinute),
        "X-RateLimit-Limit-Hour": String(user.rateLimitPerHour),
        "X-RateLimit-Limit-Day": String(user.rateLimitPerDay),
      },
    }
  );
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
