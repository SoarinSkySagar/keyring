"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
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

type ContractSetupContextValue = {
  status: ContractSetupStatus;
  contracts: UserContracts | null;
  error: string | null;
  retry: () => void;
};

const ContractSetupContext = createContext<ContractSetupContextValue>({
  status: "idle",
  contracts: null,
  error: null,
  retry: () => {},
});

/** Wrap the dashboard layout with this — runs once, shared by all consumers. */
export function ContractSetupProvider({ children }: { children: ReactNode }) {
  const { user } = usePrivy();
  const { client } = useSmartWallets();
  const [status, setStatus] = useState<ContractSetupStatus>("idle");
  const [contracts, setContracts] = useState<UserContracts | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      const existing = await getUserContractsAction();
      if (existing) {
        setContracts(existing);
        setStatus("done");
        return;
      }

      setStatus("deploying");

      const hash = await client!.writeContract({
        address: KEYRING_FACTORY_ADDRESS,
        abi: KeyringFactoryABI,
        functionName: "deploy",
        chain: aeneid,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

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
        throw new Error("RegistryDeployed event not found in transaction receipt");
      }

      const { error: saveError } = await saveUserContractsAction(
        agentRegistryAddress,
        conditionAddress
      );
      if (saveError) throw new Error(saveError);

      const deployed = { agentRegistryAddress, conditionAddress };
      setContracts(deployed);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Contract deployment failed");
      setStatus("error");
    }
  }

  return (
    <ContractSetupContext.Provider
      value={{ status, contracts, error, retry: () => { ran.current = false; run(); } }}
    >
      {children}
    </ContractSetupContext.Provider>
  );
}

/** Read contract setup state anywhere inside the dashboard. */
export function useContractSetupContext() {
  return useContext(ContractSetupContext);
}
