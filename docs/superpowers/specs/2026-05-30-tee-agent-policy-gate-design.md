# TEE Agent Policy Gate — Design Spec

**Date:** 2026-05-30
**Status:** Approved — implementing
**Topic:** Insert an AI policy-enforcement gate, running in a Phala dstack TEE, between secret unlock and HTTP execution.

---

## 1. Goal

Today `client/src/app/api/[apiKey]/route.ts` unlocks a secret (CDR decryption) and then executes the caller's HTTP task itself. This feature inserts an **AI judge running inside a Trusted Execution Environment (TEE)** between those two steps.

The agent's natural-language **`policy`** (already captured at agent-creation time — "describe what this agent should be able to do, and what it must not do") stops being decorative and becomes an **enforced contract**. On every call, a Gemini judge inside a Phala dstack enclave compares the agent's stored `policy` against the operation the agent is actually trying to run, and only if the operation is permitted does the enclave inject the real secret and make the call.

---

## 2. Decisions locked (from brainstorming)

1. **Hybrid execution model.** The caller sends a natural-language `operationRequested` **and** a structured `task` (method/url/headers/body) whose secret slots use `{{SECRET_NAME}}` placeholders. Gemini is the *policy judge* (allow/deny). The TEE is the *deterministic executor*. We do **not** ask Gemini to invent the HTTP call.
2. **Placeholders only — the plaintext key never enters Gemini's prompt.** Gemini (a remote Google API, outside the enclave) only ever sees secret *names*/placeholders. The TEE injects the real plaintext locally, only at the moment of the outbound HTTP call. This preserves the TEE's whole point.
3. **Server-side unlock, as originally specified.** The Keyring Next.js server runs `unlockVaults()` and forwards the plaintext to the worker over TLS. (The stronger variant — moving unlock *into* the enclave so the server never sees plaintext — is documented in §12 as future hardening, not built now.)

---

## 3. Architecture & data flow

```
Agent ── POST /api/{apiKey} ──► Keyring server (Next.js)
  { agentId, secretsRequested, operationRequested, task }
        │
        │  ✓ apiKey → user      ✓ rate limit
        │  ✓ agentId → agent    ✓ secretsRequested ⊆ agent.allowedSecrets
        │  unlockVaults(userId, agentKey, secretsRequested) → { STRIPE_KEY: "sk_live_…" }
        ▼
   POST {TEE_WORKER_URL}  ── TLS ──►  TEE worker  (Node/Express in dstack enclave)
   { policy, operationRequested, task, secrets }
        │
        │  ① redact: scrub any inlined plaintext from task → placeholders
        │  ② Gemini judge: (policy, operationRequested, sanitized task) → { allowed, reason }
        │       └─ secrets are NEVER in this prompt; fail closed on judge error
        │  ③ allowed=false → return { allowed:false, reason }   (no execution)
        │  ④ allowed=true  → inject real secret into task → fetch() upstream
        │  ⑤ dstack getQuote(sha256(decision)) → attestation quote
        ▼
   ◄── { allowed, reason, taskStatus?, taskResponse?, attestation }
        │
   Keyring server relays to the agent:
     allowed   → 200 { ok:true,  allowed:true,  reason, taskStatus, taskResponse, attestation }
     denied    → 403 { ok:false, allowed:false, reason }
     judgeError→ 502 { ok:false, error }            (policy check unavailable)
```

---

## 4. New API contract — `POST /api/{apiKey}`

### Request
```jsonc
{
  "agentId": "0x<agent private key>",          // unchanged — agent credential
  "secretsRequested": ["STRIPE_KEY"],          // unchanged — must be ⊆ agent.allowedSecrets
  "operationRequested": "Charge $10 to customer cus_123 for their subscription",
  "task": {
    "method": "POST",
    "url": "https://api.stripe.com/v1/charges",
    "headers": { "Authorization": "Bearer {{STRIPE_KEY}}" },
    "body": "amount=1000&currency=usd&customer=cus_123"
  }
}
```
- `operationRequested` is the natural-language description Gemini judges against the policy. **`taskRequested` is accepted as a back-compat alias.**
- `task` is required for this flow. (If `task` is omitted, we keep the legacy `{ ok, secrets }` debug response — see §6.)

### Responses
| Status | Body | When |
|---|---|---|
| `200` | `{ ok:true, allowed:true, reason, taskStatus, taskResponse, attestation }` | Policy allowed; task executed |
| `403` | `{ ok:false, allowed:false, reason }` | Policy denied the operation |
| `502` | `{ ok:false, error }` | Unlock failed / judge unavailable / TEE unreachable / upstream fetch failed |
| `400` | `{ error }` | Bad JSON / missing fields |
| `401` | `{ error }` | Bad API key / agent not recognised |
| `403` | `{ error }` | Secret not in agent's allowlist (pre-existing check) |
| `429` | `{ error }` | Rate limited |

---

## 5. TEE worker (`tee-worker/`)

Standalone Node/Express + TypeScript service. Stateless (no DB). Talks to the dstack socket and to Gemini.

### Endpoints
- `POST /execute` — the core flow (§3 ①–⑤).
- `GET /attestation` — identity quote: `DstackClient.info()` + `getQuote(sha256("keyring-tee-worker"))`. Proves genuine TEE.
- `GET /health` — `{ ok:true, dstackReachable }`.

### Modules
| File | Responsibility | Tested |
|---|---|---|
| `src/types.ts` | `ExecuteRequest`, `ExecuteResponse`, `JudgeDecision`, `Task` | — |
| `src/inject.ts` | `injectSecrets(text, secrets)` and `redactSecrets(text, secrets)` — pure string ops over url/headers/body | ✅ unit |
| `src/judge.ts` | `buildJudgePrompt()`, `parseJudgeDecision()`, `judge()` (calls Gemini REST, structured JSON output) | ✅ unit (fetch mocked) |
| `src/attestation.ts` | `attest(reportData)` and `attestationInfo()` via `DstackClient`; graceful when unreachable | — |
| `src/execute.ts` | Orchestrator: redact → judge → deny/allow → inject+fetch → attest | ✅ unit (fetch mocked) |
| `src/server.ts` | Express app + routes | — |
| `src/index.ts` | Boot: read env, start listening | — |

### Gemini judge
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, header `X-goog-api-key: $GEMINI_API_KEY`.
- `generationConfig`: `responseMimeType: "application/json"`, `responseSchema: { type:OBJECT, properties:{ allowed:BOOLEAN, reason:STRING }, required:[allowed,reason] }`, `temperature: 0`.
- System framing: "You are a security policy enforcer inside a TEE. Given an agent's fixed policy and the operation it wants to run (plus the structured HTTP request, with secrets shown only as `{{PLACEHOLDERS}}`), decide whether the policy permits it. Deny if the operation exceeds the policy, targets a different service/endpoint than the policy allows, or the structured request contradicts the stated operation. Respond only with the JSON schema."
- `gemini-flash-latest` is a thinking model → parse defensively: pick the `parts[]` entry whose `text` parses as JSON matching the schema.
- **Fail closed:** any Gemini error (non-200, empty candidates, unparseable) → `{ allowed:false, reason, judgeError:true }`. The worker never executes when the judge can't render a verdict.

### Attestation
- `reportData = sha256(JSON.stringify({ operationRequested, allowed, url: task.url }))` (32 bytes ≤ 64-byte limit).
- Returned as `attestation: { quote, eventLog, reportData, appId, instanceId }`. If dstack is unreachable, `attestation: null` (execution still proceeds — attestation is evidence, not a gate).

---

## 6. Server changes — `client/src/app/api/[apiKey]/route.ts`

- Add `policy` to the `agent` lookup `columns`.
- Read `operationRequested` (fallback `taskRequested`); require it.
- Keep `unlockVaults()` exactly as today (server-side unlock).
- **Replace** the local inject + `fetch` block (current lines ~165–232) with a single POST to `process.env.TEE_WORKER_URL` carrying `{ policy, operationRequested, task, secrets: unlockResult.secrets }`.
- Map the worker's verdict to the response table in §4. Record the call status (200 / 403 / 502) via the existing `recordCall()`.
- If `task` is omitted, preserve the legacy `{ ok:true, secrets }` response (no TEE round-trip) for back-compat/debug.
- Heed `client/AGENTS.md`: this is Next.js 16 — keep within existing route-handler conventions; no new framework APIs.

---

## 7. Security model (honest boundaries)

- ✅ The **authorization decision** and the **secret↔HTTP-call combination** happen inside the attested enclave. The plaintext key is never sent to Google/Gemini.
- ✅ Inlined-plaintext defense: `redactSecrets()` scrubs any raw secret value a sloppy caller put directly in the task before anything goes to Gemini.
- ✅ Fail-closed judge: no verdict ⇒ no execution.
- ⚠️ Server-side unlock means the Next.js server briefly holds plaintext and ships it to the worker over TLS. Accepted per the product owner's specified flow; see §12 for the stronger variant.
- ⚠️ `agentKey` and forwarded secrets are plaintext in transit/logs unless TLS + log hygiene are enforced. Worker must **never** log secret values (only names).

---

## 8. Environment & hygiene

**`tee-worker/.env`** (mirrors root `.env`):
```
DSTACK_SIMULATOR_ENDPOINT=/home/kxizen/.phala-cloud/simulator/0.5.3/dstack.sock
TAPPD_SIMULATOR_ENDPOINT=/home/kxizen/.phala-cloud/simulator/0.5.3/tappd.sock
GEMINI_API_KEY=...
PORT=3001
```
In production (Phala) `DSTACK_SIMULATOR_ENDPOINT` is unset → SDK uses `/var/run/dstack.sock`.

**`client/.env`** add:
```
TEE_WORKER_URL=http://localhost:3001/execute
```

**`.gitignore` fix (root):** currently only `.superpowers/`. The root `.env` holds a live `GEMINI_API_KEY` and is **not ignored**. Add: `.env`, `**/.env`, `**/node_modules/`, `tee-worker/dist/`.

---

## 9. Deployment

- **Now:** run against the local dstack **simulator** (already running, sockets live). `cd tee-worker && npm install && npm run dev`.
- **Later (documented, not executed here):** `Dockerfile` + `docker-compose.yml` (Phala app-compose shape) + README. Deploy needs the owner's Phala account + Docker Hub push, so it stays a documented manual step. Phala injects the real dstack socket and handles attestation/networking.

---

## 10. Testing

Worker has its own suite (Node's built-in `node:test` + `tsx`, `fetch` mocked):
- `inject.test.ts` — placeholder replacement (url/header/body), missing key left intact, multiple secrets; redaction of inlined plaintext.
- `judge.test.ts` — prompt contains policy + operation + sanitized task and **no** plaintext; parse valid JSON; thinking-model multi-part parse; fail-closed on HTTP error / empty / garbage.
- `execute.test.ts` — deny ⇒ no upstream fetch; allow ⇒ injects real secret into the upstream call and returns its status/body; judgeError propagates.

Client: typecheck `route.ts` (`npx tsc --noEmit`) / `npm run lint`.

---

## 11. Implementation breakdown (the plan)

1. **Spec** (this doc) — commit.
2. **Scaffold** `tee-worker/`: `package.json`, `tsconfig.json`, `.gitignore`, `.dockerignore`, `.env`.
3. **Worker core (TDD):** `types.ts` → `inject.ts`(+test) → `judge.ts`(+test) → `attestation.ts` → `execute.ts`(+test).
4. **Worker server:** `server.ts`, `index.ts`.
5. **Client:** rewire `route.ts`; add `TEE_WORKER_URL` to `client/.env`.
6. **Hygiene/docs:** root `.gitignore`; `tee-worker/Dockerfile`, `docker-compose.yml`, `README.md`; update `HANDOFF.md`.
7. **Verify:** `npm test` (worker) green; `npm run build` (worker) compiles; boot worker against simulator and exercise `/health`, `/attestation`, an allow `/execute`, a deny `/execute`; typecheck `route.ts`.

---

## 12. Out of scope / future hardening

- **In-enclave unlock** — move `unlockVaults()` (CDR + Pimlico + viem + WASM) into the worker so the server never sees plaintext. The strongest design; deferred per the chosen flow.
- Actual Phala Cloud deployment (owner runs it).
- Quote verification on the client side (we return the quote; verifying it on-chain/off-chain is a later step).
- Replacing the in-memory rate limiter with Redis (pre-existing caveat).
- Encrypting `agentKey`/secrets at rest (pre-existing caveat).
