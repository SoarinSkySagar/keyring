/**
 * unlock-vault.ts — server-side CDR vault decryption.
 *
 * Core permanent function: given a userId, agent private key, and list of
 * secret names, verifies access against KeyringAccessCondition on-chain,
 * then calls CDR to decrypt and return the plaintext values.
 *
 * Flow per secret:
 *  1. Load secret (secretId, cdrVaultUuid) and condition/agent addresses from DB
 *  2. Pre-check: call checkReadCondition() as a view — instant reject if no grant
 *  3. Call CDR consumer.accessCDR() — agent's wallet signs the read tx automatically
 *  4. Return plaintext
 *
 * This runs entirely server-side. No human approval or popup required.
 * The agent's wallet needs IP tokens for gas (testnet: use faucet).
 */

import { createPublicClient, createWalletClient, http, encodeAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CDRClient, initWasm } from "@piplabs/cdr-sdk";
import { db } from "@/db";
import { agents, secrets, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { KeyringAccessConditionABI } from "@/lib/contracts";
import { aeneid } from "@/lib/chains";

const STORY_RPC = "https://aeneid.storyrpc.io";
const STORY_API = "http://172.192.41.96:1317";

const sharedPublicClient = createPublicClient({
  chain: aeneid,
  transport: http(STORY_RPC),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type UnlockResult = {
  secrets: Record<string, string>; // secretName → plaintext value
  errors: Record<string, string>;  // secretName → error message (if any failed)
};

// ── Pre-check helper ──────────────────────────────────────────────────────────

async function checkCondition(
  conditionAddress: `0x${string}`,
  uuid: number,
  secretId: `0x${string}`,
  agentWalletAddress: `0x${string}`
): Promise<boolean> {
  // conditionData = abi.encode(bytes32 secretId) — baked in at vault allocation
  const conditionData = encodeAbiParameters([{ type: "bytes32" }], [secretId]);

  const result = await sharedPublicClient.readContract({
    address: conditionAddress,
    abi: KeyringAccessConditionABI,
    functionName: "checkReadCondition",
    args: [uuid, "0x", conditionData, agentWalletAddress],
  });

  return result as boolean;
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Unlock CDR vaults for the given agent and return plaintext secret values.
 *
 * @param userId          - The Keyring user who owns the secrets and contracts
 * @param agentPrivateKey - The agent's Ethereum private key (stored as agentKey in DB)
 * @param secretNames     - Names of secrets to decrypt (must already be in agent's allowlist)
 * @returns UnlockResult  - { secrets: { NAME: plaintext }, errors: { NAME: reason } }
 */
export async function unlockVaults(
  userId: string,
  agentPrivateKey: string,
  secretNames: string[]
): Promise<UnlockResult> {
  const result: UnlockResult = { secrets: {}, errors: {} };

  // 1. Load condition contract address for this user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { conditionAddress: true },
  });

  if (!user?.conditionAddress) {
    for (const name of secretNames) result.errors[name] = "Condition contract not deployed";
    return result;
  }

  // 2. Load secret rows (secretId + cdrVaultUuid)
  const secretRows = await db
    .select({ name: secrets.name, secretId: secrets.secretId, cdrVaultUuid: secrets.cdrVaultUuid })
    .from(secrets)
    .where(and(eq(secrets.userId, userId), inArray(secrets.name, secretNames)));

  // 3. Derive agent wallet address from private key
  const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);
  const agentWalletAddress = agentAccount.address;

  // 4. Init WASM crypto (idempotent)
  await initWasm();

  // 5. Build CDR client with agent's wallet — signs read tx automatically
  const walletClient = createWalletClient({
    account: agentAccount,
    chain: aeneid,
    transport: http(STORY_RPC),
  });

  const cdrClient = new CDRClient({
    network: "testnet",
    publicClient: sharedPublicClient as any,
    walletClient: walletClient as any,
    apiUrl: STORY_API,
  });

  // 6. Decrypt each vault — pre-check condition first for fast rejection
  await Promise.all(
    secretNames.map(async (name) => {
      const row = secretRows.find((r) => r.name === name);
      if (!row) {
        result.errors[name] = "Secret not found in DB";
        return;
      }

      try {
        // Fast pre-check: view call to condition contract
        const conditionPasses = await checkCondition(
          user.conditionAddress as `0x${string}`,
          row.cdrVaultUuid,
          row.secretId as `0x${string}`,
          agentWalletAddress
        );

        if (!conditionPasses) {
          result.errors[name] = "Access denied by condition contract (no active grant or expired)";
          return;
        }

        // Condition passed — unlock the vault
        const { dataKey } = await cdrClient.consumer.accessCDR({
          uuid: row.cdrVaultUuid,
          accessAuxData: "0x",
          timeoutMs: 90_000,
        });

        result.secrets[name] = new TextDecoder().decode(dataKey);
      } catch (err) {
        result.errors[name] = err instanceof Error ? err.message : "Unknown CDR error";
      }
    })
  );

  return result;
}
