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
import { toast } from "sonner";
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
      // 1. Short-circuit if already deployed
      const existing = await getUserContractsAction();
      if (existing) {
        setContracts(existing);
        setStatus("done");
        return;
      }

      if (!KEYRING_FACTORY_ADDRESS) {
        throw new Error("NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS is not set");
      }

      // 2. Deploy via user's smart wallet — user will be prompted to sign
      setStatus("deploying");
      const toastId = toast.loading("Setting up your on-chain contracts…");

      // writeContract on Privy's SmartAccountClient sends a UserOperation and
      // returns the UserOperation hash (not a transaction hash). We use the
      // smart wallet client's own waitForTransactionReceipt so it knows how
      // to resolve a UserOp hash through the bundler.
      const userOpHash = await client!.writeContract({
        address: KEYRING_FACTORY_ADDRESS,
        abi: KeyringFactoryABI,
        functionName: "deploy",
        chain: aeneid,
      });

      console.log("[ContractSetup] UserOp submitted:", userOpHash);
      toast.loading("Waiting for transaction confirmation…", { id: toastId });

      // Use the smart wallet client to wait — it handles UserOp → tx resolution.
      // Fall back to publicClient if the method isn't available (older SDK versions).
      let receipt: Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const smartClient = client as any;
      if (typeof smartClient.waitForTransactionReceipt === "function") {
        receipt = await smartClient.waitForTransactionReceipt({
          hash: userOpHash,
          timeout: 120_000,
        });
      } else {
        // Fallback: if writeContract returned a real tx hash, this will work.
        receipt = await publicClient.waitForTransactionReceipt({
          hash: userOpHash,
          timeout: 120_000,
        });
      }

      console.log("[ContractSetup] Receipt:", receipt.transactionHash);

      // 3. Parse RegistryDeployed(owner, registry, condition) from logs
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
        throw new Error("RegistryDeployed event not found in receipt");
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
      toast.success("On-chain contracts ready", { id: toastId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Contract deployment failed";
      console.error("[ContractSetup] Error:", err);
      setError(msg);
      setStatus("error");
      toast.error("Contract setup failed", { description: msg });
    }
  }

  return (
    <ContractSetupContext.Provider
      value={{
        status,
        contracts,
        error,
        retry: () => {
          ran.current = false;
          run();
        },
      }}
    >
      {children}
    </ContractSetupContext.Provider>
  );
}

/** Read contract setup state anywhere inside the dashboard. */
export function useContractSetupContext() {
  return useContext(ContractSetupContext);
}
