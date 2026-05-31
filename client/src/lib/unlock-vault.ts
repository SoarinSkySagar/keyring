/**
 * unlock-vault.ts — server-side CDR vault decryption.
 *
 * The CDR read() transaction is sent as a sponsored ERC-4337 UserOperation
 * via Pimlico — the agent's wallet pays zero gas. The agent's private key
 * (agentKey in DB) owns a SimpleAccount smart contract wallet whose address
 * is what gets registered in AgentRegistry.
 *
 * Flow per secret:
 *  1. Pre-check: checkReadCondition() view call — instant reject if no grant
 *  2. Build sponsored SmartAccountClient (Pimlico bundler + paymaster)
 *  3. Call CDR consumer.accessCDR() — UserOp signed by agent key, gas paid by Pimlico
 *  4. Return plaintext
 */

import { createPublicClient, http, encodeAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { CDRClient, initWasm } from "@piplabs/cdr-sdk";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { db } from "@/db";
import { secrets, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { KeyringAccessConditionABI } from "@/lib/contracts";
import { aeneid } from "@/lib/chains";

const STORY_RPC   = "https://aeneid.storyrpc.io";
const STORY_API   = "http://172.192.41.96:1317";
const PIMLICO_URL = process.env.PIMLICO_AENEID_TESTNET_URL!;

const ENTRY_POINT = { address: entryPoint07Address, version: "0.7" as const };

const sharedPublicClient = createPublicClient({
  chain: aeneid,
  transport: http(STORY_RPC),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type UnlockResult = {
  secrets: Record<string, string>;
  errors:  Record<string, string>;
};

// ── Smart account address (deterministic from private key) ────────────────────

/**
 * Compute the SimpleAccount address for a given owner private key.
 * This is a pure counterfactual calculation — no deployment required.
 * Used at agent creation time so AgentRegistry stores the smart account
 * address, not the raw EOA.
 */
export async function getAgentSmartAccountAddress(
  privateKey: `0x${string}`
): Promise<`0x${string}`> {
  const owner = privateKeyToAccount(privateKey);
  const smartAccount = await toSimpleSmartAccount({
    client: sharedPublicClient,
    owner,
    entryPoint: ENTRY_POINT,
  });
  return smartAccount.address;
}

// ── Pre-check helper ──────────────────────────────────────────────────────────

async function checkCondition(
  conditionAddress: `0x${string}`,
  uuid: number,
  secretId: `0x${string}`,
  agentSmartAccountAddress: `0x${string}`
): Promise<boolean> {
  const conditionData = encodeAbiParameters([{ type: "bytes32" }], [secretId]);
  const result = await sharedPublicClient.readContract({
    address: conditionAddress,
    abi: KeyringAccessConditionABI,
    functionName: "checkReadCondition",
    args: [uuid, "0x", conditionData, agentSmartAccountAddress],
  });
  return result as boolean;
}

// ── Sponsored smart account client ───────────────────────────────────────────

async function buildSponsoredClient(privateKey: `0x${string}`) {
  const owner = privateKeyToAccount(privateKey);

  const smartAccount = await toSimpleSmartAccount({
    client: sharedPublicClient,
    owner,
    entryPoint: ENTRY_POINT,
  });

  const pimlicoClient = createPimlicoClient({
    transport: http(PIMLICO_URL),
    entryPoint: ENTRY_POINT,
  });

  return createSmartAccountClient({
    account: smartAccount,
    chain: aeneid,
    bundlerTransport: http(PIMLICO_URL),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () =>
        (await pimlicoClient.getUserOperationGasPrice()).fast,
    },
  });
}

// ── Core function ─────────────────────────────────────────────────────────────

export async function unlockVaults(
  userId: string,
  agentPrivateKey: string,
  secretNames: string[]
): Promise<UnlockResult> {
  const result: UnlockResult = { secrets: {}, errors: {} };

  // 1. Load condition address for this user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { conditionAddress: true },
  });

  if (!user?.conditionAddress) {
    for (const name of secretNames) result.errors[name] = "Condition contract not deployed";
    return result;
  }

  // 2. Load secret rows
  const secretRows = await db
    .select({ name: secrets.name, secretId: secrets.secretId, cdrVaultUuid: secrets.cdrVaultUuid })
    .from(secrets)
    .where(and(eq(secrets.userId, userId), inArray(secrets.name, secretNames)));

  // 3. Build sponsored smart account client (Pimlico pays gas)
  const pk = agentPrivateKey as `0x${string}`;
  const smartAccountClient = await buildSponsoredClient(pk);
  const agentSmartAccountAddress = smartAccountClient.account.address;

  // 4. Init WASM crypto
  await initWasm();

  // 5. Build CDR client using the smart account client as walletClient
  //    SmartAccountClient implements writeContract — CDR consumer.read() goes
  //    through as a sponsored UserOp automatically.
  const cdrClient = new CDRClient({
    network: "testnet",
    publicClient: sharedPublicClient as any,
    walletClient:  smartAccountClient as any,
    apiUrl: STORY_API,
  });

  // 6. Decrypt each vault in parallel
  await Promise.all(
    secretNames.map(async (name) => {
      const row = secretRows.find((r) => r.name === name);
      if (!row) {
        result.errors[name] = "Secret not found in DB";
        return;
      }

      try {
        // Fast pre-check before spending a UserOp
        const conditionPasses = await checkCondition(
          user.conditionAddress as `0x${string}`,
          row.cdrVaultUuid,
          row.secretId as `0x${string}`,
          agentSmartAccountAddress
        );

        if (!conditionPasses) {
          result.errors[name] = "Access denied (no grant or expired)";
          return;
        }

        const { dataKey } = await cdrClient.consumer.accessCDR({
          uuid: row.cdrVaultUuid,
          accessAuxData: "0x",
          timeoutMs: 90_000,
        });

        result.secrets[name] = new TextDecoder().decode(dataKey);
      } catch (err) {
        result.errors[name] = err instanceof Error ? err.message : "CDR error";
      }
    })
  );

  return result;
}
