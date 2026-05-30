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
import { createPublicClient, http, decodeEventLog, parseAbiItem } from "viem";
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

// ERC-4337 UserOperationEvent — for checking whether the inner call succeeded
const USER_OP_EVENT = parseAbiItem(
  "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)"
);

export type ContractSetupStatus =
  | "idle"
  | "checking"
  | "deploying"
  | "done"
  | "error";

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

      // 2. Sanity-check: make sure the factory has code on-chain
      const factoryCode = await publicClient.getBytecode({
        address: KEYRING_FACTORY_ADDRESS,
      });
      if (!factoryCode || factoryCode === "0x") {
        throw new Error(
          `KeyringFactory has no bytecode at ${KEYRING_FACTORY_ADDRESS} on Aeneid. ` +
            "Redeploy with: forge script script/Deploy.s.sol --rpc-url https://aeneid.storyrpc.io/ --broadcast"
        );
      }

      // 3. Deploy via user's smart wallet (gasless UserOperation)
      setStatus("deploying");
      const toastId = toast.loading("Setting up your on-chain contracts…");

      // Privy's SmartAccountClient.writeContract() returns the bundle TX hash,
      // NOT a UserOp hash. We can use waitForTransactionReceipt directly.
      const txHash = (await client!.writeContract({
        address: KEYRING_FACTORY_ADDRESS,
        abi: KeyringFactoryABI,
        functionName: "deploy",
        chain: aeneid,
      })) as `0x${string}`;

      console.log("[ContractSetup] Bundle tx:", txHash);
      toast.loading("Waiting for transaction confirmation…", { id: toastId });

      // 4. Wait for the bundle tx to be mined
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 120_000,
      });

      console.log(
        "[ContractSetup] Receipt status:",
        receipt.status,
        "| logs:",
        receipt.logs.length
      );

      // Log every event topic so we can debug unexpected receipts
      for (const log of receipt.logs) {
        console.log("[ContractSetup] Log addr:", log.address, "topic0:", log.topics[0]);
      }

      // 5. Check whether the inner UserOp call succeeded (ERC-4337 handleOps
      //    always succeeds even when the inner call reverts).
      let innerSuccess = true;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [USER_OP_EVENT],
            eventName: "UserOperationEvent",
            topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
            data: log.data as `0x${string}`,
          });
          innerSuccess = decoded.args.success as boolean;
          console.log(
            "[ContractSetup] UserOperationEvent: success =",
            innerSuccess,
            "| gasUsed =",
            decoded.args.actualGasUsed
          );
          break;
        } catch {
          // Not this event — continue
        }
      }

      if (!innerSuccess) {
        throw new Error(
          `Deployment reverted (inner call failed). ` +
            `View on StoryScan: https://aeneid.storyscan.io/tx/${txHash}`
        );
      }

      // 6. Parse RegistryDeployed(owner, registry, condition)
      let agentRegistryAddress: string | undefined;
      let conditionAddress: string | undefined;

      for (const log of receipt.logs) {
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
          // Not this event — continue
        }
      }

      if (!agentRegistryAddress || !conditionAddress) {
        console.error(
          "[ContractSetup] RegistryDeployed not found. All log topics:",
          receipt.logs.map((l) => ({ address: l.address, topic0: l.topics[0] }))
        );
        throw new Error(
          `RegistryDeployed event not found (${receipt.logs.length} logs). ` +
            `Check tx on StoryScan: https://aeneid.storyscan.io/tx/${txHash}`
        );
      }

      // 7. Persist to DB
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
      const msg =
        err instanceof Error ? err.message : "Contract deployment failed";
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
