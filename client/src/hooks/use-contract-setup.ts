"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { createPublicClient, http, decodeEventLog } from "viem";
import { aeneid } from "@/lib/chains";
import { KeyringFactoryABI, KEYRING_FACTORY_ADDRESS } from "@/lib/contracts";
import {
  getUserContractsAction,
  saveUserContractsAction,
  type UserContracts,
} from "@/actions/contracts";

const publicClient = createPublicClient({
  chain: aeneid,
  transport: http("https://aeneid.storyrpc.io"),
});

export type ContractSetupStatus = "idle" | "checking" | "deploying" | "done" | "error";

export function useContractSetup() {
  const { user } = usePrivy();
  const { client } = useSmartWallets();
  const [status, setStatus] = useState<ContractSetupStatus>("idle");
  const [contracts, setContracts] = useState<UserContracts | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Prevent running more than once per mount even if user/client flicker
  const ran = useRef(false);

  useEffect(() => {
    if (!user || !client || ran.current) return;
    ran.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, !!client]);

  async function run() {
    setStatus("checking");
    setError(null);

    try {
      // 1. Check DB first — most visits will short-circuit here
      const existing = await getUserContractsAction();
      if (existing) {
        setContracts(existing);
        setStatus("done");
        return;
      }

      // 2. Contracts not deployed yet — deploy via user's smart wallet (gasless)
      setStatus("deploying");

      const hash = await client!.writeContract({
        address: KEYRING_FACTORY_ADDRESS,
        abi: KeyringFactoryABI,
        functionName: "deploy",
        chain: aeneid,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // 3. Parse RegistryDeployed(owner, registry, condition) from the receipt logs
      let agentRegistryAddress: string | undefined;
      let conditionAddress: string | undefined;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: KeyringFactoryABI,
            eventName: "RegistryDeployed",
            topics: log.topics,
            data: log.data,
          });
          agentRegistryAddress = decoded.args.registry as string;
          conditionAddress = decoded.args.condition as string;
          break;
        } catch {
          // Not the event we're looking for — continue
        }
      }

      if (!agentRegistryAddress || !conditionAddress) {
        throw new Error(
          "RegistryDeployed event not found in transaction receipt"
        );
      }

      // 4. Persist to DB
      const { error: saveError } = await saveUserContractsAction(
        agentRegistryAddress,
        conditionAddress
      );
      if (saveError) throw new Error(saveError);

      const deployed = { agentRegistryAddress, conditionAddress };
      setContracts(deployed);
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Contract deployment failed"
      );
      setStatus("error");
    }
  }

  return {
    status,
    contracts,
    error,
    retry: () => {
      ran.current = false;
      run();
    },
  };
}
