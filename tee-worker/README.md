# Keyring TEE Worker

An AI **policy-enforcement gate** that runs inside a [Phala dstack](https://docs.phala.network/) (Intel TDX) enclave.

The Keyring server unlocks a secret from CDR, then hands it to this worker. Inside the enclave a **Gemini judge** compares the agent's stored natural-language **policy** ("what it may and must not do") against the **operation the agent is actually requesting**. Only if the policy permits it does the enclave inject the real secret into the outbound HTTP call and execute it. The plaintext secret is **never** placed in the model's prompt — Gemini only ever sees `{{PLACEHOLDERS}}`.

```
Keyring server ──POST /execute──► TEE worker (enclave)
  { policy, operationRequested, task, secrets }
        │
        │  ① redact any inlined plaintext from the task
        │  ② Gemini judge: policy vs operation vs task → { allowed, reason }
        │  ③ deny  → return verdict, no execution
        │  ④ allow → inject real secret → fetch upstream
        │  ⑤ bind verdict to a TDX attestation quote
        ▼
  ◄── { allowed, reason, taskStatus?, taskResponse?, attestation }
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/execute` | Judge the policy, then (if allowed) execute the task. Returns the verdict + result + attestation. Always `200` for a clean verdict; `400` on a malformed body. |
| `GET` | `/attestation` | Identity attestation — `appId`, `instanceId`, and a TDX quote proving genuine TEE execution. |
| `GET` | `/health` | Liveness probe. |

### `POST /execute`

Request:
```jsonc
{
  "policy": "May read Stripe charges. Must never create or refund charges.",
  "operationRequested": "List recent charges for reconciliation",
  "task": {
    "method": "GET",
    "url": "https://api.stripe.com/v1/charges",
    "headers": { "Authorization": "Bearer {{STRIPE_KEY}}" },
    "body": null
  },
  "secrets": { "STRIPE_KEY": "sk_live_…" }
}
```

Response (allowed + executed):
```jsonc
{
  "allowed": true,
  "reason": "Reading charges is within the agent's stated reconciliation duties.",
  "taskStatus": 200,
  "taskResponse": { "...": "upstream body" },
  "attestation": { "quote": "0400…", "eventLog": "…", "reportData": "…", "appId": "…", "instanceId": "…" }
}
```

Response (denied): `{ "allowed": false, "reason": "…", "attestation": { … } }`
Fail-closed judge error: `{ "allowed": false, "reason": "…", "judgeError": true }`

## Local development (dstack simulator)

The worker talks to a local dstack simulator in dev. The simulator sockets are referenced by `DSTACK_SIMULATOR_ENDPOINT` / `TAPPD_SIMULATOR_ENDPOINT` in `.env`.

```bash
cp .env.example .env      # then fill in GEMINI_API_KEY and the simulator socket paths
npm install
npm run dev               # tsx watch, listens on :3001
```

Smoke test:
```bash
curl localhost:3001/health
curl localhost:3001/attestation
curl -X POST localhost:3001/execute -H 'Content-Type: application/json' -d '{
  "policy": "May only GET public data. Must never POST/PUT/DELETE.",
  "operationRequested": "Fetch a test document",
  "task": { "method": "GET", "url": "https://httpbin.org/get", "headers": {} },
  "secrets": {}
}'
```

## Environment

| Var | Dev | Production (Phala) |
|---|---|---|
| `GEMINI_API_KEY` | required | required (set as encrypted env in Phala) |
| `GEMINI_MODEL` | `gemini-flash-latest` | `gemini-flash-latest` |
| `PORT` | `3001` | `3001` |
| `DSTACK_SIMULATOR_ENDPOINT` | simulator socket path | **unset** (SDK uses `/var/run/dstack.sock`) |
| `TAPPD_SIMULATOR_ENDPOINT` | simulator socket path | **unset** |

## Tests

```bash
npm test        # node:test + tsx — pure logic with fetch/judge/attest mocked
npm run build   # tsc --noEmit typecheck
```

The security-critical core is unit-tested: placeholder injection, inlined-secret
redaction, the Gemini judge (incl. fail-closed paths), request validation, and
the execute orchestrator (deny → no execution; allow → injected execution).

## Deploy to Phala Cloud

1. Build & push the image:
   ```bash
   docker build -t YOUR_DOCKERHUB_USER/keyring-tee-worker:latest .
   docker push YOUR_DOCKERHUB_USER/keyring-tee-worker:latest
   ```
2. Edit `docker-compose.yml` to reference your image.
3. Create a Phala Cloud app from `docker-compose.yml`, setting `GEMINI_API_KEY` as an encrypted env var. Phala mounts the real dstack socket and exposes the service.
4. Point the Keyring server at it: set `TEE_WORKER_URL=https://<your-phala-host>/execute` in `client/.env`.

## Notes

- **Image size:** `@phala/dstack-sdk` declares `viem`/`@solana/web3.js` as peer deps, so `npm install` pulls them even though the worker only uses `getQuote`/`info`. They can be pruned with a multi-stage build if image size matters.
- **Stateless:** the worker holds no DB and no persistent secrets; it processes one request and forgets it.
- **Never logs secret values** — only the operation, target URL, and verdict.
