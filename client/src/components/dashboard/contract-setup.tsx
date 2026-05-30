"use client";

import { useContractSetup } from "@/hooks/use-contract-setup";

/**
 * Transparent component — renders no UI.
 * Runs useContractSetup() on every dashboard load and silently deploys
 * AgentRegistry + KeyringAccessCondition if not yet done for this user.
 */
export function ContractSetup() {
  useContractSetup();
  return null;
}
