"use server";

import { getCurrentUser } from "@/lib/privy";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

export type AgentRow = {
  id: string;
  name: string;
  agentKey: string;
  allowedSecrets: string[];
  policy: string;
  status: string;
  createdAt: Date;
};

function generateAgentKey(): string {
  // Fully alphanumeric: "agt" + 32 lowercase hex chars
  return "agt" + randomBytes(16).toString("hex");
}

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
    allowedSecrets: r.allowedSecrets,
    policy: r.policy,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

// ── Create ───────────────────────────────────────────────────────

export async function createAgentAction(
  name: string,
  allowedSecrets: string[],
  policy: string
): Promise<{ agent?: AgentRow; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  if (!name.trim()) return { error: "Name is required" };
  if (!allowedSecrets.length) return { error: "Select at least one secret" };
  if (policy.trim().length < 20) return { error: "Policy too short" };

  const agentKey = generateAgentKey();

  const [row] = await db
    .insert(agents)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: name.trim(),
      agentKey,
      allowedSecrets,
      policy: policy.trim(),
    })
    .returning();

  return {
    agent: {
      id: row.id,
      name: row.name,
      agentKey: row.agentKey,
      allowedSecrets: row.allowedSecrets,
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

  const newKey = generateAgentKey();

  const [row] = await db
    .update(agents)
    .set({ agentKey: newKey })
    .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
    .returning({ agentKey: agents.agentKey });

  if (!row) return { error: "Agent not found" };
  return { agentKey: row.agentKey };
}
