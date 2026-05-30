"use server";

import { getCurrentUser } from "@/lib/privy";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserContracts = {
  agentRegistryAddress: string;
  conditionAddress: string;
};

/** Returns the deployed contract addresses for the current user, or null if not yet deployed. */
export async function getUserContractsAction(): Promise<UserContracts | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!user.agentRegistryAddress || !user.conditionAddress) return null;

  return {
    agentRegistryAddress: user.agentRegistryAddress,
    conditionAddress: user.conditionAddress,
  };
}

/** Saves deployed contract addresses for the current user. */
export async function saveUserContractsAction(
  agentRegistryAddress: string,
  conditionAddress: string
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .update(users)
    .set({ agentRegistryAddress, conditionAddress })
    .where(eq(users.id, user.id));

  return {};
}
