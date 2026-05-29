"use server";

import { getCurrentUser } from "@/lib/privy";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

/** SHA-256 hex digest of the raw API key — used for DB lookup. */
function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Generate a new random API key: `kr_` + 32 random hex bytes. */
function createApiKey(): string {
  return "kr_" + randomBytes(32).toString("hex");
}

// ── Generate / Regenerate ────────────────────────────────────────

/**
 * Generates a new API key for the authenticated user.
 * Stores only the SHA-256 hash in the database.
 * Returns the plaintext key ONCE — it cannot be retrieved again.
 */
export async function generateApiKeyAction(): Promise<{
  key?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const key = createApiKey();
  const hash = hashApiKey(key);

  await db
    .update(users)
    .set({ apiKeyHash: hash })
    .where(eq(users.id, user.id));

  return { key };
}

// ── Status ───────────────────────────────────────────────────────

/**
 * Returns whether the current user has an API key configured.
 * Does NOT return the key itself.
 */
export async function getApiKeyStatusAction(): Promise<{
  configured: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { configured: false, error: "Not authenticated" };

  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { apiKeyHash: true },
  });

  return { configured: !!row?.apiKeyHash };
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
