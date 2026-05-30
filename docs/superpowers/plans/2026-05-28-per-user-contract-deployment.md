# Per-User Contract Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy per-user `AgentRegistry` + `KeyringAccessCondition` contracts on every dashboard load when the user's DB record has no contract addresses, using the user's embedded smart wallet for gasless deployment.

**Architecture:** A `KeyringFactory` contract (deployed once by us) lets any smart wallet call `deploy()` in a single transaction — the factory deploys both contracts and emits a `RegistryDeployed` event containing both addresses. The dashboard checks the user's DB record on load; if contracts are missing it silently deploys via the smart wallet and saves the addresses. Contract addresses are also shown in the profile dropdown below the embedded wallet address.

**Tech Stack:** Solidity 0.8.26, Foundry, viem 2.x, Privy smart wallets (`useSmartWallets`), Next.js server actions, Drizzle ORM.

---

## File Map

**New/modified contracts:**
- Modify: `contracts/src/AgentRegistry.sol` — constructor takes explicit `owner_` address instead of using `msg.sender`; add `onlyOwner` to `createAgent`
- Create: `contracts/src/KeyringFactory.sol` — one-call factory that deploys both contracts, emits `RegistryDeployed(owner, registry, condition)`
- Modify: `contracts/test/AgentRegistry.t.sol` — update constructor call to pass explicit owner
- Create: `contracts/test/KeyringFactory.t.sol` — fork test for factory deployment
- Modify: `contracts/script/Deploy.s.sol` — deploy `KeyringFactory` only (user contracts deployed by users)

**New/modified client files:**
- Create: `client/src/lib/contracts.ts` — ABIs, bytecodes (extracted post-build), Story Protocol + factory addresses
- Create: `client/src/actions/contracts.ts` — `getUserContractsAction`, `saveUserContractsAction`
- Create: `client/src/hooks/use-contract-setup.ts` — deployment hook, checks DB then deploys if missing
- Modify: `client/src/app/dashboard/layout.tsx` — wrap children in `<ContractSetup>`
- Create: `client/src/components/dashboard/contract-setup.tsx` — client component that runs the hook
- Modify: `client/src/components/dashboard/user-menu.tsx` — show registry + condition addresses below embedded wallet

---

## Task 1: Update AgentRegistry constructor and add onlyOwner

**Files:**
- Modify: `contracts/src/AgentRegistry.sol`
- Modify: `contracts/test/AgentRegistry.t.sol`

- [ ] **Step 1: Update constructor to accept explicit owner**

Replace the constructor in `contracts/src/AgentRegistry.sol`:

```solidity
/// @param registrationWorkflows  Story Protocol RegistrationWorkflows address.
/// @param owner_                 Address that will own this registry (the user's smart wallet).
constructor(
    address registrationWorkflows,
    address owner_
) Ownable(owner_) {
    if (registrationWorkflows == address(0)) revert ZeroAddress();
    if (owner_ == address(0)) revert ZeroAddress();
    REGISTRATION_WORKFLOWS = IRegistrationWorkflows(registrationWorkflows);

    spgNft = REGISTRATION_WORKFLOWS.createCollection(
        ISPGNFT.InitParams({
            name: "Keyring Agents",
            symbol: "KRAG",
            baseURI: "",
            contractURI: "",
            maxSupply: type(uint32).max,
            mintFee: 0,
            mintFeeToken: address(0),
            mintFeeRecipient: address(0),
            owner: owner_,
            mintOpen: true,
            isPublicMinting: false
        })
    );
}
```

- [ ] **Step 2: Add onlyOwner to createAgent**

Change the `createAgent` function signature:

```solidity
function createAgent(
    string calldata name,
    address agentWallet
) external onlyOwner returns (address ipId) {
```

- [ ] **Step 3: Update AgentRegistry fork test**

In `contracts/test/AgentRegistry.t.sol`, the setUp deploys with the old two-arg constructor. Update:

```solidity
function setUp() public {
    vm.startPrank(owner);
    registry = new AgentRegistry(REGISTRATION_WORKFLOWS, owner);
    vm.stopPrank();
}
```

This is already correct — `owner` is passed explicitly. No change needed if the param name change didn't affect the call. Verify by running:

```bash
cd contracts
forge test --fork-url https://aeneid.storyrpc.io/ --match-contract AgentRegistryTest -v
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add contracts/src/AgentRegistry.sol contracts/test/AgentRegistry.t.sol
git commit -m "feat(contracts): explicit owner param on AgentRegistry, onlyOwner on createAgent"
```

---

## Task 2: Create KeyringFactory contract

**Files:**
- Create: `contracts/src/KeyringFactory.sol`
- Create: `contracts/test/KeyringFactory.t.sol`

- [ ] **Step 1: Write the KeyringFactory contract**

Create `contracts/src/KeyringFactory.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { AgentRegistry }          from "./AgentRegistry.sol";
import { KeyringAccessCondition } from "./KeyringAccessCondition.sol";

/// @title  KeyringFactory
/// @notice Deployed once by Keyring. Any user smart wallet calls deploy() to get
///         their own AgentRegistry + KeyringAccessCondition in a single transaction.
///         The caller (msg.sender) becomes the owner of both contracts.
contract KeyringFactory {
    // ── constants ──────────────────────────────────────────────────────────────
    address public immutable REGISTRATION_WORKFLOWS;

    // ── events ─────────────────────────────────────────────────────────────────
    /// @notice Emitted when a user deploys their contract pair.
    /// @param  owner      The caller's address (user smart wallet).
    /// @param  registry   The deployed AgentRegistry address.
    /// @param  condition  The deployed KeyringAccessCondition address.
    event RegistryDeployed(
        address indexed owner,
        address indexed registry,
        address indexed condition
    );

    // ── errors ─────────────────────────────────────────────────────────────────
    error ZeroAddress();

    constructor(address registrationWorkflows) {
        if (registrationWorkflows == address(0)) revert ZeroAddress();
        REGISTRATION_WORKFLOWS = registrationWorkflows;
    }

    /// @notice Deploys AgentRegistry and KeyringAccessCondition for msg.sender.
    ///         The caller becomes the owner of both contracts.
    /// @return registry   Deployed AgentRegistry address.
    /// @return condition  Deployed KeyringAccessCondition address.
    function deploy() external returns (address registry, address condition) {
        registry  = address(new AgentRegistry(REGISTRATION_WORKFLOWS, msg.sender));
        condition = address(new KeyringAccessCondition(registry));
        emit RegistryDeployed(msg.sender, registry, condition);
    }
}
```

- [ ] **Step 2: Write the fork test**

Create `contracts/test/KeyringFactory.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test }             from "forge-std/Test.sol";
import { KeyringFactory }   from "../src/KeyringFactory.sol";
import { AgentRegistry }    from "../src/AgentRegistry.sol";
import { KeyringAccessCondition } from "../src/KeyringAccessCondition.sol";

/// @notice Fork test for KeyringFactory. Needs Aeneid RPC.
///         Run: forge test --fork-url https://aeneid.storyrpc.io/ --match-contract KeyringFactoryTest -v
contract KeyringFactoryTest is Test {
    address constant REGISTRATION_WORKFLOWS = 0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424;

    KeyringFactory factory;
    address user = makeAddr("user");

    function setUp() public {
        factory = new KeyringFactory(REGISTRATION_WORKFLOWS);
    }

    function test_deploy_returnsBothAddresses() public {
        vm.prank(user);
        (address registry, address condition) = factory.deploy();

        assertTrue(registry   != address(0), "registry should be non-zero");
        assertTrue(condition  != address(0), "condition should be non-zero");
        assertTrue(registry   != condition,  "addresses should differ");
    }

    function test_deploy_setsOwnership() public {
        vm.prank(user);
        (address registry, ) = factory.deploy();

        assertEq(AgentRegistry(registry).owner(), user, "registry owner should be user");
    }

    function test_deploy_wiresConditionToRegistry() public {
        vm.prank(user);
        (address registry, address condition) = factory.deploy();

        assertEq(
            address(KeyringAccessCondition(condition).REGISTRY()),
            registry,
            "condition registry should match deployed registry"
        );
    }

    function test_deploy_emitsRegistryDeployed() public {
        vm.prank(user);
        vm.expectEmit(true, false, false, false);
        emit KeyringFactory.RegistryDeployed(user, address(0), address(0));
        factory.deploy();
    }

    function test_deploy_differentUsersGetDifferentContracts() public {
        address user2 = makeAddr("user2");

        vm.prank(user);
        (address reg1, address cond1) = factory.deploy();

        vm.prank(user2);
        (address reg2, address cond2) = factory.deploy();

        assertTrue(reg1  != reg2,  "each user gets unique registry");
        assertTrue(cond1 != cond2, "each user gets unique condition");
    }
}
```

- [ ] **Step 3: Run fork tests**

```bash
cd contracts
forge test --fork-url https://aeneid.storyrpc.io/ --match-contract KeyringFactoryTest -v
```

Expected: 5/5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add contracts/src/KeyringFactory.sol contracts/test/KeyringFactory.t.sol
git commit -m "feat(contracts): KeyringFactory — one-call per-user deployment"
```

---

## Task 3: Update deploy script and compile, extract artifacts

**Files:**
- Modify: `contracts/script/Deploy.s.sol`

- [ ] **Step 1: Update deploy script to only deploy the factory**

Replace `contracts/script/Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { KeyringFactory }   from "../src/KeyringFactory.sol";

/// @notice Deploys KeyringFactory (once, by Keyring team).
///         Each user deploys their own AgentRegistry + KeyringAccessCondition
///         by calling KeyringFactory.deploy() from their smart wallet.
///
/// Usage:
///   forge script script/Deploy.s.sol \
///     --rpc-url https://aeneid.storyrpc.io/ \
///     --broadcast \
///     --private-key $PRIVATE_KEY
contract Deploy is Script {
    address constant REGISTRATION_WORKFLOWS = 0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        KeyringFactory factory = new KeyringFactory(REGISTRATION_WORKFLOWS);
        vm.stopBroadcast();

        console2.log("KeyringFactory deployed:", address(factory));
        console2.log("\n--- Copy to client/.env ---");
        console2.log("NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS=", address(factory));
    }
}
```

- [ ] **Step 2: Build contracts and verify**

```bash
cd contracts
forge build
```

Expected: `Compiler run successful` — no errors.

- [ ] **Step 3: Extract ABI and bytecode for client**

Run this to get the values you'll paste into `contracts.ts` in the next task:

```bash
cd contracts

# AgentRegistry
cat out/AgentRegistry.sol/AgentRegistry.json | python3 -c "
import json, sys
a = json.load(sys.stdin)
print('=== AgentRegistry ABI ===')
print(json.dumps(a['abi']))
print()
print('=== AgentRegistry Bytecode ===')
print(a['bytecode']['object'])
"

# KeyringAccessCondition
cat out/KeyringAccessCondition.sol/KeyringAccessCondition.json | python3 -c "
import json, sys
a = json.load(sys.stdin)
print('=== KeyringAccessCondition ABI ===')
print(json.dumps(a['abi']))
print()
print('=== KeyringAccessCondition Bytecode ===')
print(a['bytecode']['object'])
"

# KeyringFactory
cat out/KeyringFactory.sol/KeyringFactory.json | python3 -c "
import json, sys
a = json.load(sys.stdin)
print('=== KeyringFactory ABI ===')
print(json.dumps(a['abi']))
print()
print('=== KeyringFactory Bytecode ===')
print(a['bytecode']['object'])
"
```

- [ ] **Step 4: Commit**

```bash
git add contracts/script/Deploy.s.sol
git commit -m "feat(contracts): update deploy script — factory only, users deploy their own contracts"
```

---

## Task 4: Create client/src/lib/contracts.ts

**Files:**
- Create: `client/src/lib/contracts.ts`

- [ ] **Step 1: Create the file with extracted ABIs and bytecodes**

Create `client/src/lib/contracts.ts`. The bytecodes below must be replaced with the actual output from the extraction command in Task 3 Step 3:

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Keyring smart contract ABIs, bytecodes and network constants.
//
// Bytecodes are extracted from contracts/out/ after `forge build`.
// Re-extract and update here whenever contracts change.
// ─────────────────────────────────────────────────────────────────────────────

// ── Network constants ────────────────────────────────────────────────────────

/** Story Protocol Aeneid testnet — RegistrationWorkflows (SPG) */
export const REGISTRATION_WORKFLOWS_ADDRESS =
  "0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424" as const;

/** KeyringFactory — deployed once by Keyring, address added after deployment */
export const KEYRING_FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS ?? "") as `0x${string}`;

// ── KeyringFactory ───────────────────────────────────────────────────────────

export const KeyringFactoryABI = [
  // PASTE ABI from Task 3 Step 3 output here
] as const;

// ── AgentRegistry ────────────────────────────────────────────────────────────

export const AgentRegistryABI = [
  // PASTE ABI from Task 3 Step 3 output here
] as const;

export const AgentRegistryBytecode =
  // PASTE bytecode from Task 3 Step 3 output here (as a string starting with 0x)
  "" as `0x${string}`;

// ── KeyringAccessCondition ───────────────────────────────────────────────────

export const KeyringAccessConditionABI = [
  // PASTE ABI from Task 3 Step 3 output here
] as const;

export const KeyringAccessConditionBytecode =
  // PASTE bytecode from Task 3 Step 3 output here
  "" as `0x${string}`;
```

- [ ] **Step 2: Type-check**

```bash
cd client
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/contracts.ts
git commit -m "feat(client): contracts.ts — ABIs, bytecodes, factory address"
```

---

## Task 5: Server actions for contract addresses

**Files:**
- Create: `client/src/actions/contracts.ts`

- [ ] **Step 1: Create the server action file**

Create `client/src/actions/contracts.ts`:

```typescript
"use server";

import { getCurrentUser } from "@/lib/privy";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserContracts = {
  agentRegistryAddress: string;
  conditionAddress: string;
};

/** Returns the deployed contract addresses for the current user, or null if not yet deployed. */
export async function getUserContractsAction(): Promise<UserContracts | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!user.agentRegistryAddress || !user.conditionAddress) return null;

  return {
    agentRegistryAddress: user.agentRegistryAddress,
    conditionAddress: user.conditionAddress,
  };
}

/** Saves deployed contract addresses for the current user. */
export async function saveUserContractsAction(
  agentRegistryAddress: string,
  conditionAddress: string
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .update(users)
    .set({ agentRegistryAddress, conditionAddress })
    .where(eq(users.id, user.id));

  return {};
}
```

- [ ] **Step 2: Type-check**

```bash
cd client
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/actions/contracts.ts
git commit -m "feat(client): server actions for reading/saving user contract addresses"
```

---

## Task 6: Contract deployment hook

**Files:**
- Create: `client/src/hooks/use-contract-setup.ts`

- [ ] **Step 1: Create the hook**

Create `client/src/hooks/use-contract-setup.ts`:

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { createPublicClient, http, decodeEventLog } from "viem";
import { aeneid } from "@/lib/chains";
import { KeyringFactoryABI, KEYRING_FACTORY_ADDRESS } from "@/lib/contracts";
import { getUserContractsAction, saveUserContractsAction, type UserContracts } from "@/actions/contracts";

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
  }, [user?.id, !!client]); // eslint-disable-line react-hooks/exhaustive-deps

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
        account: client!.account,
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
          conditionAddress     = decoded.args.condition as string;
          break;
        } catch {
          // Not the event we're looking for — continue
        }
      }

      if (!agentRegistryAddress || !conditionAddress) {
        throw new Error("RegistryDeployed event not found in transaction receipt");
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
      setError(err instanceof Error ? err.message : "Contract deployment failed");
      setStatus("error");
    }
  }

  return { status, contracts, error, retry: () => { ran.current = false; run(); } };
}
```

- [ ] **Step 2: Type-check**

```bash
cd client
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/use-contract-setup.ts
git commit -m "feat(client): useContractSetup hook — checks DB, deploys via smart wallet if missing"
```

---

## Task 7: ContractSetup component and dashboard layout wiring

**Files:**
- Create: `client/src/components/dashboard/contract-setup.tsx`
- Modify: `client/src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create the ContractSetup component**

Create `client/src/components/dashboard/contract-setup.tsx`:

```typescript
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
```

- [ ] **Step 2: Add ContractSetup to the dashboard layout**

Replace `client/src/app/dashboard/layout.tsx`:

```typescript
import { Sidebar } from "@/components/dashboard/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ContractSetup } from "@/components/dashboard/contract-setup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ContractSetup />
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-60">{children}</div>
      </div>
    </AuthGuard>
  );
}
```

- [ ] **Step 3: Type-check and verify build**

```bash
cd client
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/dashboard/contract-setup.tsx client/src/app/dashboard/layout.tsx
git commit -m "feat(client): ContractSetup component wired into dashboard layout"
```

---

## Task 8: Show contract addresses in UserMenu dropdown

**Files:**
- Modify: `client/src/components/dashboard/user-menu.tsx`

- [ ] **Step 1: Add contract address display to the dropdown**

The dropdown currently shows the embedded wallet section. Add a new section below it for the contract addresses. The addresses come from `useContractSetup()`.

In `client/src/components/dashboard/user-menu.tsx`, add the import and hook usage, then add the new section:

```typescript
// Add to imports at top:
import { useContractSetup } from "@/hooks/use-contract-setup";

// Inside UserMenu(), after the existing hooks:
const { contracts } = useContractSetup();
```

Add this section in the JSX, between the embedded wallet section and the sign-out button:

```tsx
{/* Contract addresses */}
{contracts && (
  <div className="px-4 py-3 border-b border-border space-y-2">
    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
      On-chain Contracts
    </p>
    <div className="space-y-1.5">
      <ContractAddressRow label="Agent Registry" address={contracts.agentRegistryAddress} />
      <ContractAddressRow label="Access Condition" address={contracts.conditionAddress} />
    </div>
  </div>
)}
```

Add the helper component at the bottom of the file (above the closing of the module):

```typescript
function ContractAddressRow({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
      <button
        onClick={copy}
        className="flex items-center justify-between w-full group"
      >
        <span className="text-xs font-mono text-foreground">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <span className="text-muted-foreground group-hover:text-foreground transition-colors ml-2 flex-shrink-0">
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </span>
      </button>
    </div>
  );
}
```

Note: `ContractAddressRow` uses its own `copied` state independently per row so copying one doesn't affect the other.

- [ ] **Step 2: Type-check**

```bash
cd client
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dashboard/user-menu.tsx
git commit -m "feat(client): show AgentRegistry and condition addresses in user menu dropdown"
```

---

## Task 9: Deploy KeyringFactory and update env

- [ ] **Step 1: Get IP tokens from faucet**

Go to `https://faucet.story.foundation` and fund the deployer wallet with IP tokens for gas.

- [ ] **Step 2: Deploy factory to Aeneid**

```bash
cd contracts
export PRIVATE_KEY=0x<your_deployer_key>

forge script script/Deploy.s.sol \
  --rpc-url https://aeneid.storyrpc.io/ \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Expected output:
```
KeyringFactory deployed: 0x<address>
--- Copy to client/.env ---
NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS= 0x<address>
```

- [ ] **Step 3: Add to client/.env**

```
NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS=0x<address_from_above>
```

- [ ] **Step 4: Commit env example** (not the .env itself)

Add to `client/.env.example` (or `.env.template` if it exists):
```
NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS=
```

```bash
git add client/.env.example 2>/dev/null || true
git commit -m "chore: add NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS to env template" 2>/dev/null || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- ✅ Check DB on every dashboard load (not just first login) — `useContractSetup` runs on every mount, short-circuits if DB has addresses
- ✅ Deploy if addresses missing (new or existing user) — deployment fires whenever `getUserContractsAction` returns null
- ✅ Uses user's embedded smart wallet (gasless) — `client.writeContract` via `useSmartWallets`
- ✅ Show contract addresses in profile dropdown — Task 8
- ✅ Story Protocol SDK — the factory and contracts use Story Protocol's `RegistrationWorkflows` directly; the TypeScript SDK (`@story-protocol/core-sdk`) is not yet installed and would be relevant for client-side IP Asset reads / CDR interactions, not for contract deployment itself

**Story Protocol SDK note:** The `@story-protocol/core-sdk` package would be used for the CDR flow (agent reads secrets) and IP Asset queries, not for factory deployment. No TypeScript SDK calls are needed in this plan's scope. Install when implementing the CDR flow.

**Placeholder scan:** No TBDs or vague steps. Task 4 Step 1 contains placeholder ABI/bytecode comments — these are intentional instructions to paste from Task 3 Step 3 output, not placeholder logic.

**Type consistency:** `UserContracts` defined in `actions/contracts.ts`, imported into `use-contract-setup.ts` and used in `user-menu.tsx`. `ContractSetupStatus` defined in the hook, not exported since nothing else needs it yet.
