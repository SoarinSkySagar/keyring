"use client";

import { ContractSetupProvider } from "@/context/contract-setup-context";

/**
 * Wraps dashboard children with ContractSetupProvider.
 * Runs the deployment check exactly once per mount — state is shared
 * across all consumers (e.g. UserMenu) via context.
 */
export function ContractSetup({ children }: { children: React.ReactNode }) {
  return <ContractSetupProvider>{children}</ContractSetupProvider>;
}
