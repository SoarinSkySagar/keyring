# Keyring — Agent Handoff Document

Everything a new agent needs to understand the project, pick up where work left off, and continue without asking clarifying questions.

---

## Project Goal

**Keyring is a secrets management platform for AI agents, built on blockchain rails.**

Users store API keys and credentials as encrypted secrets. They whitelist AI agents to access those secrets. When an agent calls Keyring's API with valid credentials, it receives the plaintext secret — but only if three on-chain conditions pass. The entire access control layer is verifiable on-chain via Story Protocol IP Assets and CDR (Confidential Data Rails).

The audience is non-technical users who don't know blockchain. They should never see wallet addresses, fund accounts, or sign transactions manually — everything is gasless and abstracted away via Privy smart wallets + Pimlico ERC-4337 paymaster.

---

## Current Status

All core flows are **fully implemented and working**, including the TEE (Trusted Execution Environment) policy-gate worker. The only remaining piece is deploying that worker to Phala Cloud — it runs locally today against the dstack simulator.

### What works end-to-end today:
1. **Auth** — Privy social login (email/Google), smart wallet auto-created per user
2. **Contract deployment** — On first login, user's smart wallet deploys `AgentRegistry` + `KeyringAccessCondition` via `KeyringFactory`. Gasless. Addresses saved to DB.
3. **Secrets** — User stores secrets (e.g. `STRIPE_KEY`). Each secret gets a CDR vault (on-chain encrypted storage). Allocation + write batched into one UserOp.
4. **Agents** — User creates agents (e.g. `TradingBot`). Each agent is minted as a Story Protocol IP Asset. Access to selected secrets is granted on-chain via `KeyringAccessCondition.grantAccess()`. All gasless.
5. **API** — Agent calls `POST /api/{apiKey}` with `{ agentId, secretsRequested, operationRequested, task }`. Server verifies credentials, runs CDR decryption server-side using the agent's private key (via Pimlico-sponsored UserOp), then forwards the secret + the agent's policy + the requested operation to the TEE worker.
6. **TEE policy gate** — Inside a Phala dstack enclave (`tee-worker/`), a Gemini judge compares the agent's stored `policy` against the `operationRequested`. If allowed, the enclave injects the secret into the HTTP task, executes it, and returns the result plus a TDX attestation quote. If denied, the server returns `403` with the reason. The plaintext secret is never placed in Gemini's prompt (only `{{PLACEHOLDERS}}`). Runs against the local dstack simulator today; only Phala deployment remains.

---

## Repository Layout

```
keyring/
├── client/                  ← Next.js 16 app (the entire product UI + API)
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/   ← Protected pages (secrets, access/agents, authorization, home)
│   │   │   ├── api/
│   │   │   │   ├── [apiKey]/route.ts          ← Main agent API endpoint
│   │   │   │   └── story-proxy/[...path]/     ← CORS proxy for Story validator API
│   │   │   └── (auth)/login, signup
│   │   ├── actions/         ← Server actions (agents.ts, secrets.ts, contracts.ts, etc.)
│   │   ├── components/
│   │   │   ├── dashboard/   ← Tab content components
│   │   │   └── ui/          ← shadcn/ui primitives
│   │   ├── context/
│   │   │   └── contract-setup-context.tsx  ← Auto-deploys contracts on first login
│   │   ├── db/
│   │   │   └── schema.ts    ← Drizzle ORM schema (PostgreSQL)
│   │   └── lib/
│   │       ├── cdr.ts       ← CDR SDK wrapper: upload secrets to CDR vaults
│   │       ├── chains.ts    ← Aeneid chain definition (Story Protocol testnet)
│   │       ├── contracts.ts ← Contract ABIs + addresses
│   │       ├── privy.ts     ← Server-side auth helper (getCurrentUser)
│   │       └── unlock-vault.ts  ← Server-side CDR decryption via Pimlico UserOps
│   ├── drizzle/             ← SQL migrations (applied via drizzle-kit push)
│   └── .env                 ← Local env (not committed)
├── contracts/               ← Foundry smart contracts
│   ├── src/
│   │   ├── AgentRegistry.sol          ← Mints IP Assets, wallet→ipId registry
│   │   ├── KeyringAccessCondition.sol ← CDR read condition, vault grants
│   │   ├── KeyringFactory.sol         ← Deploys both above in one call
│   │   └── interfaces/
│   ├── script/Deploy.s.sol            ← Deploys KeyringFactory (run once by team)
│   └── test/
├── tee-worker/              ← TEE policy-gate worker (Node/Express, runs in Phala dstack)
│   ├── src/                 ← inject, judge (Gemini), attestation (dstack), execute, server
│   ├── Dockerfile           ← image for Phala deployment
│   └── README.md            ← local simulator run + Phala deploy steps
├── docs/                    ← Design docs and plans
└── HANDOFF.md               ← This file
```

---

## Tech Stack

### Frontend / App
| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| Language | TypeScript (ES2020 target) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth | Privy (`@privy-io/react-auth` + `@privy-io/server-auth`) |
| State | React 19 + server actions |
| Database | PostgreSQL via Neon (`drizzle-orm` + `postgres`) |
| Toasts | Sonner |

### Blockchain / Web3
| Layer | Technology |
|---|---|
| Chain | Story Protocol Aeneid testnet (chain ID 1315, RPC `https://aeneid.storyrpc.io`) |
| Explorer | `https://aeneid.storyscan.io` |
| EVM library | viem v2.51 |
| Smart wallet (user) | Privy Kernel smart wallet (ERC-4337), gasless via Pimlico |
| Smart wallet (agent) | permissionless.js v0.3.6 `toSimpleSmartAccount` (ERC-4337 EntryPoint 0.7) |
| Gas sponsorship | Pimlico paymaster (`@pimlico.io/v2/1315/rpc`) |
| Secrets storage | CDR (`@piplabs/cdr-sdk` v0.2.1) — on-chain encrypted vaults |
| IP Assets | Story Protocol `RegistrationWorkflows.mintAndRegisterIp()` |
| Contracts | Foundry (Solidity ^0.8.26) |

### Smart Contracts (deployed on Aeneid)
| Contract | Notes |
|---|---|
| `KeyringFactory` | Deployed once by Keyring team. Address in `NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS`. |
| `AgentRegistry` | One per user — deployed by their smart wallet via `KeyringFactory.deploy()`. |
| `KeyringAccessCondition` | One per user — deployed alongside AgentRegistry. |
| `RegistrationWorkflows` (Story) | `0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424` — used by AgentRegistry to mint IP Assets |
| CDR precompile | `0xCcCcCC0000000000000000000000000000000005` — accessed via `@piplabs/cdr-sdk` |
| DKG precompile | `0xCcCcCC0000000000000000000000000000000004` — threshold key generation for encryption |

---

## Database Schema (PostgreSQL / Neon)

```
users
  id, privyId, name, email
  agentRegistryAddress   ← null until ContractSetupProvider deploys
  conditionAddress       ← null until ContractSetupProvider deploys
  apiKeyHash             ← SHA-256 of the raw API key (key itself never stored)
  rateLimitPerMinute/Hour/Day

agents
  id, userId, name
  agentKey               ← 0x-prefixed Ethereum private key (the agent's credential + CDR signing key)
  walletAddress          ← EOA derived from agentKey (not used for CDR — SimpleAccount is)
  ipId                   ← Story Protocol IP Asset address
  allowedSecrets[]       ← display names (e.g. ["STRIPE_KEY", "OPENAI_KEY"])
  allowedSecretIds[]     ← bytes32 0x-hex matching secrets.secretId (for on-chain grant/revoke)
  policy, status, createdAt

secrets
  id, userId, name
  secretId               ← client-generated bytes32 (0x-prefixed) baked into CDR vault readConditionData
  cdrVaultUuid           ← CDR-assigned uint32 vault number

apiCalls
  id, userId, agentId, path, method, status, latencyMs, createdAt

grants, auditEvents  ← legacy tables, not actively used in current flow
```

---

## Core Architecture: How It All Fits Together

### Secret Storage Flow (user stores a secret)

```
Dashboard (Secrets tab)
  1. generateSecretId() → random bytes32 secretId
  2. Read CDR uuid counter → nextUuid
  3. Encrypt secretValue locally with DKG global pubkey → ciphertext
  4. Batch UserOp (user's Privy smart wallet):
       a. CDR.allocate(updatable=false, writeCondition=smartWallet, readCondition=conditionAddress, readConditionData=abi.encode(secretId))
       b. CDR.write(nextUuid, "0x", ciphertext)
  5. Parse VaultAllocated event → actualUuid
  6. Server action: DB.insert(secrets, { name, secretId, cdrVaultUuid: actualUuid })
  Note: registerVault() is NOT called separately — the vault's readConditionData alone
        is enough for checkReadCondition() to work. grantAccess() handles registration.
```

### Agent Creation Flow (user whitelists an agent)

```
Dashboard (Access tab)
  1. Generate Ethereum private key (32 random bytes → 0x + hex)
  2. Compute SimpleAccount address (deterministic from private key via toSimpleSmartAccount)
     — this SimpleAccount address is what CDR sees as msg.sender during reads
  3. On-chain tx 1 (user smart wallet): AgentRegistry.createAgent(name, simpleAccountAddress)
     → mints Story Protocol IP Asset via mintAndRegisterIp()
     → stores walletToIpId[simpleAccountAddress] = ipId
  4. Read ipId via getIpId(simpleAccountAddress)
  5. On-chain tx 2 (batched UserOp): for each selected secret:
       KeyringAccessCondition.grantAccess(secretId, ipId, 0n)
       (0n = permanent access, no expiry)
  6. Server action: DB.insert(agents, { agentKey: privateKey, walletAddress: EOA, ipId, ... })
  7. Show private key to user — this is the "Agent ID" they give to their agent
```

### API Call Flow (agent decrypts secrets)

```
POST /api/{apiKey}
  Body: {
    agentId: "0x...",              ← agent's private key
    secretsRequested: ["STRIPE_KEY"],
    operationRequested: "charge customer",
    task: {
      method: "POST",
      url: "https://api.stripe.com/v1/charges",
      headers: { "Authorization": "Bearer {{STRIPE_KEY}}" },
      body: "{\"amount\": 1000}"
    }
  }

  1. Hash apiKey → look up user in DB
  2. Rate limit check (in-memory sliding window)
  3. Look up agent by agentKey → verify status=active, user matches
  4. Check secretsRequested ⊆ agent.allowedSecrets
  5. unlockVaults(userId, agentKey, secretsRequested):
       a. Load user.conditionAddress from DB
       b. Build Pimlico-sponsored SmartAccountClient from agentKey
          (SimpleAccount with Pimlico as paymaster — zero gas cost)
       c. For each secret: checkReadCondition() view call (fast pre-check)
       d. CDRClient.consumer.accessCDR({ uuid, timeoutMs: 90_000 })
          → sends UserOp via Pimlico bundler
          → CDR precompile calls KeyringAccessCondition.checkReadCondition()
          → validators produce partial decryptions
          → SDK combines → plaintext returned
  6. Forward to the TEE worker (TEE_WORKER_URL):
       { policy: agent.policy, operationRequested, task, secrets }
  7. Worker: Gemini judge rules on policy vs operationRequested vs task
       - denied  → server returns 403 { ok:false, allowed:false, reason }
       - allowed → worker injects secrets, executes the HTTP call inside the enclave
  8. Return { ok, allowed, reason, taskStatus, taskResponse, attestation }
```

### On-Chain Access Check (inside CDR during step 5d)

```
KeyringAccessCondition.checkReadCondition(uuid, "0x", conditionData, caller)
  conditionData = abi.encode(secretId)   ← baked in when vault was allocated
  caller = agent's SimpleAccount address  ← msg.sender of the CDR read UserOp

  Check 1: ipId = AgentRegistry.getIpId(caller) → must be non-zero
  Check 2: AgentRegistry.isActiveAgent(ipId) → must be true
  Check 3: grantActive[secretId][ipId] → must be true
  Check 4: grantExpiry[secretId][ipId] == 0 || block.timestamp < expiry
  All 4 must pass → return true → CDR releases decryption shares
```

---

## Key Design Decisions

**Agent identity = Ethereum private key**: The `agentKey` stored in DB is the raw private key. The user copies this key and gives it to their agent. The agent passes it as `agentId` in API calls. Server-side, this key is used to derive a SimpleAccount and sign CDR UserOps. The EOA is never used for gas — Pimlico pays.

**SimpleAccount, not EOA**: CDR reads go through a Pimlico-sponsored ERC-4337 UserOp. The `SimpleAccount` address (derived deterministically from the private key via `toSimpleSmartAccount`) is what gets registered in `AgentRegistry`, so when CDR calls `checkReadCondition(caller=simpleAccountAddress)`, the `walletToIpId` lookup succeeds.

**Per-user contracts**: Every user gets their own `AgentRegistry` and `KeyringAccessCondition`. This isolates users completely — one user's agent can never accidentally access another user's vaults.

**Secrets use `secretId` not `uuid` as identity**: CDR vaults are identified by `uint32 uuid`, but `uuid` is assigned at allocation time and can't be known before the transaction. Keyring pre-generates a `bytes32 secretId` client-side, bakes it into `readConditionData` at allocation, and uses that for all grant/revoke operations. The `uuid` is only needed for CDR read calls.

**No `registerVault` required**: The condition contract's `grantAccess` function was updated to accept any caller — vault registration is implicit via `grantAccess`. The `registerVault` function exists for explicit registration but isn't called in the current flow.

---

## Environment Variables

```bash
# client/.env (not committed)

NEXT_PUBLIC_PRIVY_APP_ID=cmpoh2ea6000l0cl87phlh09k
PRIVY_APP_SECRET=<from privy.io dashboard>

DATABASE_URL=postgresql://<neon connection string>

NEXT_PUBLIC_APP_URL=http://localhost:3000

# KeyringFactory deployed on Aeneid (run once by team)
NEXT_PUBLIC_KEYRING_FACTORY_ADDRESS=<from forge deploy output>

# Pimlico API for sponsoring agent CDR reads (server-side)
PIMLICO_API_KEY=pim_BNy91NYs7u6an34jnrHvH9
PIMLICO_AENEID_TESTNET_URL=https://api.pimlico.io/v2/1315/rpc?apikey=pim_BNy91NYs7u6an34jnrHvH9

# Resend (email — optional for auth flows)
RESEND_API_KEY=<from resend.com>

# TEE worker endpoint (the policy-gate enclave)
TEE_WORKER_URL=http://localhost:3001/execute
```

```bash
# tee-worker/.env (not committed) — see tee-worker/.env.example

GEMINI_API_KEY=<from aistudio.google.com/apikey>
GEMINI_MODEL=gemini-flash-latest
PORT=3001
# Local dev only — point at the dstack simulator sockets. Leave BOTH unset in
# production so the SDK uses the Phala-mounted /var/run/dstack.sock.
DSTACK_SIMULATOR_ENDPOINT=<…/simulator/0.5.3/dstack.sock>
TAPPD_SIMULATOR_ENDPOINT=<…/simulator/0.5.3/tappd.sock>
```

---

## Running Locally

```bash
cd client
npm install
npm run dev   # starts on http://localhost:3000
```

Database migrations: `npx drizzle-kit push` (only needed after schema changes).

Contracts: Already deployed on Aeneid. To redeploy KeyringFactory:
```bash
cd contracts
forge build
PRIVATE_KEY=0x... forge script script/Deploy.s.sol --rpc-url https://aeneid.storyrpc.io/ --broadcast
```

---

## What's Left: Deploy the TEE worker to Phala

The TEE worker is **built and working** in `tee-worker/` (see `tee-worker/README.md`). It runs against the local dstack simulator today. What remains is deploying it to Phala Cloud.

### What the worker does
The Keyring server unlocks the secret (server-side, via CDR) and POSTs `{ policy, operationRequested, task, secrets }` to the worker. Inside the enclave:
1. it redacts any inlined plaintext from the task,
2. a Gemini judge rules on `policy` vs `operationRequested` vs `task` → `{ allowed, reason }` (the plaintext secret is never in the prompt — only `{{PLACEHOLDERS}}`),
3. on **deny**, it returns the verdict and does nothing else,
4. on **allow**, it injects the real secret and executes the HTTP call,
5. it binds the verdict to a TDX attestation quote (returned to the caller).

### Chosen TEE: Phala Cloud (Intel TDX)
- Small TDX instance: ~$0.058/hour
- Docker-based: `tee-worker/Dockerfile` + `tee-worker/docker-compose.yml` are ready
- Phala handles attestation + networking automatically

**AWS Nitro was evaluated and rejected**: no direct network access (vsock only), requires a parent EC2 instance, costs more.

### Deploy steps
1. `docker build -t YOUR_DOCKERHUB_USER/keyring-tee-worker:latest tee-worker/ && docker push YOUR_DOCKERHUB_USER/keyring-tee-worker:latest`
2. Create a Phala Cloud app from `tee-worker/docker-compose.yml`, with `GEMINI_API_KEY` set as an encrypted env var.
3. Set `TEE_WORKER_URL=https://<phala-host>/execute` in `client/.env`.

### Future hardening (not done)
The server still unlocks the secret and forwards plaintext to the worker over TLS. The strongest design moves `unlockVaults()` (CDR + Pimlico + viem + WASM) *into* the enclave so the server never sees plaintext. Deferred by design choice — see `docs/superpowers/specs/2026-05-30-tee-agent-policy-gate-design.md` §12.

---

## API Reference

### `POST /api/{apiKey}`

Authentication: `apiKey` is a `kr_`-prefixed key set from the dashboard (Settings tab).

**Request body:**
```typescript
{
  agentId: string;            // agent's private key (0x + 64 hex chars)
  secretsRequested: string[]; // secret names the agent needs (⊆ agent.allowedSecrets)
  operationRequested: string; // natural-language description the TEE judge rules on
                              // (taskRequested accepted as a back-compat alias)
  task?: {                    // optional — if omitted, returns { ok, secrets } (debug)
    method: string;           // HTTP method
    url: string;              // URL — supports {{SECRET_NAME}} placeholders
    headers?: Record<string, string>; // supports {{SECRET_NAME}} placeholders
    body?: string | null;     // supports {{SECRET_NAME}} placeholders
  }
}
```

**Response (allowed + executed):**
```json
{ "ok": true, "allowed": true, "reason": "…", "taskStatus": 200, "taskResponse": {}, "attestation": {} }
```

**Response (denied by policy):** `403`
```json
{ "ok": false, "allowed": false, "reason": "Operation violates the policy: …" }
```

**Response (without task — legacy/debug):**
```json
{ "ok": true, "secrets": { "STRIPE_KEY": "sk_live_abc123" } }
```

**Error responses:** `401` (bad API key / agent not found), `403` (secret not allowed, or policy denied), `429` (rate limited), `502` (CDR decryption failed / TEE unreachable / policy check unavailable / upstream call failed).

---

## File Map: Where to Find Things

| Task | File |
|---|---|
| Agent creation UI | `client/src/components/dashboard/access-content.tsx` |
| Agent DB actions | `client/src/actions/agents.ts` |
| Secret creation UI | `client/src/components/dashboard/secrets-content.tsx` |
| Secret DB actions | `client/src/actions/secrets.ts` |
| CDR upload (store secret) | `client/src/lib/cdr.ts` |
| CDR read / vault unlock | `client/src/lib/unlock-vault.ts` |
| Main API endpoint | `client/src/app/api/[apiKey]/route.ts` |
| TEE worker (policy judge + execute) | `tee-worker/src/` |
| TEE worker README / deploy steps | `tee-worker/README.md` |
| Contract ABIs + addresses | `client/src/lib/contracts.ts` |
| Contract auto-deploy on login | `client/src/context/contract-setup-context.tsx` |
| DB schema | `client/src/db/schema.ts` |
| Chain definition (Aeneid) | `client/src/lib/chains.ts` |
| AgentRegistry contract | `contracts/src/AgentRegistry.sol` |
| Access condition contract | `contracts/src/KeyringAccessCondition.sol` |
| Factory contract | `contracts/src/KeyringFactory.sol` |
| Deploy script | `contracts/script/Deploy.s.sol` |

---

## Known Caveats

1. **Agents created before the Pimlico change are broken.** Early agents registered the EOA address (not SimpleAccount) in AgentRegistry. CDR calls from those agents fail at `walletToIpId` lookup. Only agents created after commit `77915b1` work correctly.

2. **Story API CORS**: The Story validator API (`http://172.192.41.96:1317`) has no CORS headers. Browser-side CDR operations go through the `/api/story-proxy` Next.js route. Server-side operations call the API directly.

3. **Rate limiter is in-memory**: The sliding window rate limiter (`route.ts` lines 12-46) resets on server restart. Fine for demo; replace with Redis for production.

4. **agentKey stored in plaintext**: The agent private key is stored in the DB unencrypted. This is intentional for the demo — the server needs it to sign CDR UserOps. Production would use a KMS or HSM.

5. **`tsconfig.json` target must be `ES2020`**: Required for BigInt literal support (`0n`). Was previously `ES2017` which caused TS error `2737`. Do not revert.

6. **Pimlico free tier limits**: The Pimlico API key (`pim_BNy91NYs7u6an34jnrHvH9`) is on the free tier. For production, upgrade to avoid rate limits on sponsored UserOps.
