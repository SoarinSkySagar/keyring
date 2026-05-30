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

      // writeContract on Privy's SmartAccountClient sends a UserOperation.
      // The factory deployment needs ~2M gas; set an explicit gas limit so
      // Pimlico's auto-estimation doesn't cap callGasLimit too low.
      const userOpHash = await client!.writeContract({
        address: KEYRING_FACTORY_ADDRESS,
        abi: KeyringFactoryABI,
        functionName: "deploy",
        chain: aeneid,
        gas: BigInt(3_000_000), // explicit callGasLimit headroom for AgentRegistry constructor
      });

      console.log("[ContractSetup] UserOp submitted:", userOpHash);
      toast.loading("Waiting for transaction confirmation…", { id: toastId });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const smartClient = client as any;

      // waitForUserOperationReceipt gives us:
      //   .success  — whether the inner call succeeded
      //   .reason   — revert reason if it failed
      //   .logs     — logs emitted by our call only (not the whole bundle tx)
      //   .receipt  — the actual Ethereum tx receipt
      let deployLogs: Array<{ address: string; topics: readonly string[]; data: string }>;

      if (typeof smartClient.waitForUserOperationReceipt === "function") {
        const userOpReceipt = await smartClient.waitForUserOperationReceipt({
          hash: userOpHash,
          timeout: 120_000,
        });
        console.log("[ContractSetup] UserOp success:", userOpReceipt.success);
        console.log("[ContractSetup] UserOp reason:", userOpReceipt.reason);
        console.log("[ContractSetup] UserOp logs:", userOpReceipt.logs?.length);
        console.log("[ContractSetup] Bundle txHash:", userOpReceipt.receipt?.transactionHash);

        if (!userOpReceipt.success) {
          throw new Error(
            `Deployment reverted: ${userOpReceipt.reason ?? "out of gas or inner call failed"}`
          );
        }
        deployLogs = userOpReceipt.logs ?? [];
      } else {
        // Fallback: parse the full bundle tx receipt
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: userOpHash,
          timeout: 120_000,
        });
        console.log("[ContractSetup] Fallback receipt status:", receipt.status);
        console.log("[ContractSetup] Fallback logs:", receipt.logs.length);
        deployLogs = receipt.logs;
      }

      // 3. Parse RegistryDeployed(owner, registry, condition) from logs
      let agentRegistryAddress: string | undefined;
      let conditionAddress: string | undefined;

      for (const log of deployLogs) {
        try {
          const decoded = decodeEventLog({
            abi: KeyringFactoryABI,
            eventName: "RegistryDeployed",
            topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
            data: log.data as `0x${string}`,
          });
          agentRegistryAddress = decoded.args.registry as string;
          conditionAddress = decoded.args.condition as string;
          break;
        } catch {
          // Not the event we're looking for — continue
        }
      }

      if (!agentRegistryAddress || !conditionAddress) {
        console.error(
          "[ContractSetup] RegistryDeployed not found in logs:",
          deployLogs.map((l) => ({ address: l.address, topics: l.topics }))
        );
        throw new Error(
          `RegistryDeployed event not found (${deployLogs.length} logs). ` +
          `Check the transaction on StoryScan.`
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
