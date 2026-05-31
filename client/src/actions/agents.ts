"use server";

import { getCurrentUser } from "@/lib/privy";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { privateKeyToAccount } from "viem/accounts";

export type AgentRow = {
  id: string;
  name: string;
  agentKey: string;            // 0x-prefixed Ethereum private key — the agent's credential
  walletAddress: string | null;
  ipId: string | null;
  allowedSecrets: string[];    // display names
  allowedSecretIds: string[];  // bytes32 0x-hex — for grantAccess/revokeAccess
  policy: string;
  status: string;
  createdAt: Date;
};

// ── List ─────────────────────────────────────────────────────────

export async function getAgentsAction(): Promise<AgentRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await db.query.agents.findMany({
    where: eq(agents.userId, user.id),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    agentKey: r.agentKey,
    walletAddress: r.walletAddress,
    ipId: r.ipId,
    allowedSecrets: r.allowedSecrets,
    allowedSecretIds: r.allowedSecretIds,
    policy: r.policy,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

// ── Create ───────────────────────────────────────────────────────

export async function createAgentAction(
  name: string,
  allowedSecrets: string[],    // display names
  allowedSecretIds: string[],  // bytes32 0x-hex
  policy: string,
  privateKey: string,          // 0x + 32 bytes hex — agent's Ethereum private key
  ipId: string
): Promise<{ agent?: AgentRow; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  if (!name.trim()) return { error: "Name is required" };
  if (!allowedSecrets.length) return { error: "Select at least one secret" };
  if (policy.trim().length < 20) return { error: "Policy too short" };
  if (!privateKey.startsWith("0x") || privateKey.length !== 66)
    return { error: "Invalid private key" };

  // Derive wallet address server-side to ensure consistency
  const { address: walletAddress } = privateKeyToAccount(privateKey as `0x${string}`);

  const [row] = await db
    .insert(agents)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: name.trim(),
      agentKey: privateKey,   // agentKey IS the private key
      allowedSecrets,
      allowedSecretIds,
      policy: policy.trim(),
      walletAddress,
      ipId,
    })
    .returning();

  return {
    agent: {
      id: row.id,
      name: row.name,
      agentKey: row.agentKey,
      walletAddress: row.walletAddress,
      ipId: row.ipId,
      allowedSecrets: row.allowedSecrets,
      allowedSecretIds: row.allowedSecretIds,
      policy: row.policy,
      status: row.status,
      createdAt: row.createdAt,
    },
  };
}

// ── Delete ───────────────────────────────────────────────────────

export async function deleteAgentAction(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .delete(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, user.id)));

  return {};
}

// ── Regenerate key ───────────────────────────────────────────────

export async function regenerateAgentKeyAction(
  id: string
): Promise<{ agentKey?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  // Generate a new Ethereum private key and derive the new wallet address
  const { randomBytes } = await import("crypto");
  const newPrivateKey = ("0x" + randomBytes(32).toString("hex")) as `0x${string}`;
  const { address: newWalletAddress } = privateKeyToAccount(newPrivateKey);

  const [row] = await db
    .update(agents)
    .set({ agentKey: newPrivateKey, walletAddress: newWalletAddress })
    .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
    .returning({ agentKey: agents.agentKey });

  if (!row) return { error: "Agent not found" };
  return { agentKey: row.agentKey };
}
