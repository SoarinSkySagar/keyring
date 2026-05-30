"use server";

import { getCurrentUser } from "@/lib/privy";
import { db } from "@/db";
import { secrets } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type SecretRow = {
  id: string;
  name: string;
  secretId: string;      // 0x-prefixed bytes32 — needed by access tab for grantAccess
  cdrVaultUuid: number;  // CDR uuid — needed by agents to call cdr.read(uuid, ...)
  createdAt: Date;
};

// ── List ─────────────────────────────────────────────────────────

export async function getSecretsAction(): Promise<SecretRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return db
    .select()
    .from(secrets)
    .where(eq(secrets.userId, user.id))
    .orderBy(desc(secrets.createdAt));
}

// ── Create ───────────────────────────────────────────────────────

export async function createSecretAction(
  name: string,
  secretId: string,
  cdrVaultUuid: number
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  if (!name.trim()) return { error: "Name is required" };
  if (!secretId.startsWith("0x") || secretId.length !== 66)
    return { error: "Invalid secretId" };

  await db.insert(secrets).values({
    userId: user.id,
    name: name.trim(),
    secretId,
    cdrVaultUuid,
  });

  return {};
}

// ── Delete ───────────────────────────────────────────────────────
// Note: the CDR vault is non-updatable and lives on-chain permanently.
// Deleting from DB removes it from the dashboard; the on-chain data stays.

export async function deleteSecretAction(
  id: string
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .delete(secrets)
    .where(and(eq(secrets.id, id), eq(secrets.userId, user.id)));

  return {};
}
