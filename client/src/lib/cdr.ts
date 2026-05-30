/**
 * CDR SDK wrapper for Keyring secret vaults.
 *
 * Story Protocol Aeneid testnet:
 *   EVM RPC : https://aeneid.storyrpc.io
 *   Story API: http://172.192.41.96:1317  (DKG REST endpoint)
 *
 * Flow (per secret):
 *  1. Generate secretId (bytes32) client-side — before CDR allocate
 *  2. uploadSecretToCDR() → single batched UserOp (allocate + write) → cdrVaultUuid
 *  3. registerVault(secretId) via SmartAccountClient (condition contract)
 *  4. DB: save { name, secretId, cdrVaultUuid }
 *
 * Batching strategy:
 *   We pre-read the CDR contract's current uuid counter — the counter IS the next
 *   available uuid (allocate() assigns that exact value and increments the counter).
 *   We encrypt to that label, then send allocate + write as a single Kernel
 *   batch UserOperation.
 *
 * CDR fee model (verified on-chain):
 *   allocateFee = 0, writeFee = 0 — send value: 0n for both calls.
 *   baseFee (0.03 IP) is unrelated to msg.value; CDR does strict equality on fee.
 *
 * Condition setup:
 *   writeConditionAddr = smartWalletAddress  →  CDR bypasses write condition check
 *                                               when msg.sender == writeConditionAddr
 *   readConditionAddr  = conditionAddress    →  KeyringAccessCondition gates agent reads
 *   readConditionData  = abi.encode(secretId) → baked into vault; decoded by condition
 */

import { CDRClient, initWasm, uuidToLabel } from "@piplabs/cdr-sdk";
import { cdrAbi, contractAddresses } from "@piplabs/cdr-contracts";
import {
  createPublicClient,
  encodeAbiParameters,
  http,
  toHex,
  type WalletClient,
  type TransactionReceipt,
} from "viem";
import { aeneid } from "@/lib/chains";

// ── Constants ────────────────────────────────────────────────────────────────

const CDR_ADDRESS = contractAddresses.testnet.cdr as `0x${string}`;

// VaultAllocated(uint32 uuid, bool updatable, address writeConditionAddr,
//                address readConditionAddr, bytes writeConditionData, bytes readConditionData)
const VAULT_ALLOCATED_TOPIC =
  "0xf1370099e56e061a64615edc07c1d17e36a20585cdc9b288bf0259a528365d0a" as const;

// The Story API validator node has no CORS headers, so we proxy through
// /api/story-proxy (a Next.js route) which relays server-to-server.
function getStoryApiUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/story-proxy`;
  }
  return "http://172.192.41.96:1317";
}

// Shared public client — one instance per module load
const aeneidPublicClient = createPublicClient({
  chain: aeneid,
  transport: http("https://aeneid.storyrpc.io"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a random bytes32 secretId. Returns 0x-prefixed hex string. */
export function generateSecretId(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return ("0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

/**
 * Encode a secretId into the readConditionData that gets baked into the CDR vault.
 * The condition contract decodes this to identify which vault is being read.
 */
export function encodeConditionData(secretId: `0x${string}`): `0x${string}` {
  return encodeAbiParameters([{ type: "bytes32" }], [secretId]);
}

/**
 * Parse the actual allocated UUID from a CDR transaction receipt.
 * Reads the VaultAllocated event — the first uint32 in the unindexed data.
 * Throws if the event is not found (tx didn't include a CDR allocate call).
 */
function parseAllocatedUuid(receipt: TransactionReceipt): number {
  const log = receipt.logs.find(
    (l) =>
      l.address.toLowerCase() === CDR_ADDRESS.toLowerCase() &&
      l.topics[0] === VAULT_ALLOCATED_TOPIC
  );
  if (!log) throw new Error("VaultAllocated event not found in receipt — CDR allocate may have failed");
  // First 32 bytes of data = uint32 uuid (ABI-padded)
  const uuid = parseInt(log.data.slice(2, 66), 16);
  if (isNaN(uuid) || uuid <= 0) throw new Error(`Invalid uuid parsed from VaultAllocated: ${log.data}`);
  return uuid;
}

// ── Core upload function ──────────────────────────────────────────────────────

/**
 * Allocate a CDR vault and write the encrypted secret in a SINGLE batched UserOperation.
 * Returns the CDR-assigned vault UUID (uint32) verified from the on-chain event.
 *
 * Throws if the transaction reverts or the VaultAllocated event is missing.
 *
 * @param secretValue        Plaintext value to encrypt
 * @param secretId           bytes32 secretId — baked into readConditionData, stored in DB
 * @param smartWalletAddress User's smart wallet — set as CDR write condition (bypass)
 * @param conditionAddress   Deployed KeyringAccessCondition — set as CDR read condition
 * @param walletClient       Privy SmartAccountClient (cast as WalletClient)
 */
export async function uploadSecretToCDR(
  secretValue: string,
  secretId: `0x${string}`,
  smartWalletAddress: `0x${string}`,
  conditionAddress: `0x${string}`,
  walletClient: unknown
): Promise<number> {
  const wc = walletClient as WalletClient;

  // Must initialise WASM crypto before any encryption
  await initWasm();

  // Step 1 — Read the CDR uuid counter.
  // The counter IS the next available uuid: allocate() assigns this exact value
  // and increments the counter to uuid+1.
  const nextUuid = await aeneidPublicClient.readContract({
    address: CDR_ADDRESS,
    abi: cdrAbi,
    functionName: "uuid",
  }) as number;

  // Step 2 — Encrypt the secret locally using the predicted UUID label
  const cdrClient = new CDRClient({
    network: "testnet",
    publicClient: aeneidPublicClient,
    walletClient: wc,
    apiUrl: getStoryApiUrl(),
  });

  const dataKey = new TextEncoder().encode(secretValue);
  const label = uuidToLabel(nextUuid);
  const ciphertext = await cdrClient.uploader.encryptDataKey({ dataKey, label });
  const encryptedData = toHex(ciphertext.raw);

  // readConditionData = abi.encode(bytes32 secretId) — baked into vault at allocation.
  // KeyringAccessCondition.checkReadCondition() decodes this to look up the grant.
  const readConditionData = encodeAbiParameters([{ type: "bytes32" }], [secretId]);

  // Step 3 — Build calldata for allocate and write
  const { encodeFunctionData } = await import("viem");

  const allocateCalldata = encodeFunctionData({
    abi: cdrAbi,
    functionName: "allocate",
    args: [
      false,                // updatable
      smartWalletAddress,   // writeConditionAddr — bypass: CDR skips when msg.sender == addr
      conditionAddress,     // readConditionAddr  — KeyringAccessCondition gates agent reads
      "0x",                 // writeConditionData (unused by bypass)
      readConditionData,    // readConditionData  = abi.encode(secretId)
    ],
  });

  const writeCalldata = encodeFunctionData({
    abi: cdrAbi,
    functionName: "write",
    args: [nextUuid, "0x", encryptedData],
  });

  // Step 4 — Send as a single batched UserOperation via Privy's SmartAccountClient.
  //
  // Privy wraps sendTransaction to accept { calls: [...] } for batching — this encodes
  // both calls into one Kernel execute() UserOp.
  // CDR fees: allocateFee = 0, writeFee = 0 → value: 0n for both.
  const txHash = await (wc as any).sendTransaction({
    calls: [
      { to: CDR_ADDRESS, data: allocateCalldata, value: 0n },
      { to: CDR_ADDRESS, data: writeCalldata,    value: 0n },
    ],
  });

  const receipt = await aeneidPublicClient.waitForTransactionReceipt({ hash: txHash });

  // Hard check: if the batch reverted (e.g. uuid race condition), throw immediately.
  // This prevents a stale uuid from being saved to the DB.
  if (receipt.status !== "success") {
    throw new Error(`CDR allocate+write transaction reverted (txHash: ${txHash})`);
  }

  // Parse the actual allocated uuid from the VaultAllocated event.
  // This is the ground truth — it confirms allocate ran and gives the real uuid.
  const actualUuid = parseAllocatedUuid(receipt);

  return actualUuid;
}
