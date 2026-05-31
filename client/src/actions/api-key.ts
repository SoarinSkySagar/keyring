"use server";

import { getCurrentUser } from "@/lib/privy";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

function createApiKey(): string {
  return "kr_" + randomBytes(32).toString("hex");
}

// ── Generate / Regenerate ────────────────────────────────────────

export async function generateApiKeyAction(): Promise<{
  key?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const key = createApiKey();

  await db
    .update(users)
    .set({ apiKey: key })
    .where(eq(users.id, user.id));

  return { key };
}

// ── Get key ──────────────────────────────────────────────────────

export async function getApiKeyAction(): Promise<{
  key?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { apiKey: true },
  });

  return { key: row?.apiKey ?? undefined };
}

// ── Rate limits ──────────────────────────────────────────────────

export async function getRateLimitsAction(): Promise<{
  perMinute: number;
  perHour: number;
  perDay: number;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { perMinute: 60, perHour: 1000, perDay: 10000, error: "Not authenticated" };
  }

  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: {
      rateLimitPerMinute: true,
      rateLimitPerHour: true,
      rateLimitPerDay: true,
    },
  });

  return {
    perMinute: row?.rateLimitPerMinute ?? 60,
    perHour: row?.rateLimitPerHour ?? 1000,
    perDay: row?.rateLimitPerDay ?? 10000,
  };
}

export async function saveRateLimitsAction(
  perMinute: number,
  perHour: number,
  perDay: number
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .update(users)
    .set({
      rateLimitPerMinute: Math.max(1, Math.min(1000, perMinute)),
      rateLimitPerHour: Math.max(1, Math.min(100000, perHour)),
      rateLimitPerDay: Math.max(1, Math.min(1000000, perDay)),
    })
    .where(eq(users.id, user.id));

  return {};
}
