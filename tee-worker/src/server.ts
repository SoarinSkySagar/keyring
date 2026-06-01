import express, { type ErrorRequestHandler } from "express";
import { validateExecuteRequest } from "./validate";
import { executeRequest } from "./execute";
import { attestationInfo } from "./attestation";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  const judgeConfig = {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
  };

  // Liveness — no enclave round-trip.
  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "keyring-tee-worker" });
  });

  // Identity attestation — proves this code runs in a genuine TEE.
  app.get("/attestation", async (_req, res) => {
    res.json(await attestationInfo());
  });

  // The core flow: judge the policy, then (only if allowed) execute inside the enclave.
  app.post("/execute", async (req, res) => {
    const parsed = validateExecuteRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    if (!judgeConfig.apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured in the enclave" });
      return;
    }

    const result = await executeRequest(parsed.value, { judgeConfig });

    // Never log secret values — only the operation, target, and verdict.
    console.log(
      `[execute] ${result.allowed ? "ALLOW" : "DENY "} ${parsed.value.task.method} ` +
        `${parsed.value.task.url} :: ${parsed.value.operationRequested}` +
        (result.judgeError ? " (judge-error)" : "") +
        (result.executionError ? " (exec-error)" : ""),
    );

    res.status(200).json(result);
  });

  // JSON-parse failures and anything unexpected → clean JSON error.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    res.status(status).json({ error: err?.message ?? "internal error" });
  };
  app.use(errorHandler);

  return app;
}
