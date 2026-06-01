import { judge as realJudge, type JudgeConfig, type JudgeInput } from "./judge";
import { attest as realAttest } from "./attestation";
import { injectTask, redactTask } from "./inject";
import type {
  Attestation,
  ExecuteRequest,
  ExecuteResponse,
  JudgeDecision,
} from "./types";

export interface ExecuteDeps {
  judgeConfig: JudgeConfig;
  judgeImpl?: (input: JudgeInput, config: JudgeConfig) => Promise<JudgeDecision>;
  attestImpl?: (payload: unknown) => Promise<Attestation | null>;
  fetchImpl?: typeof fetch;
}

async function readBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json().catch(() => null);
  }
  return res.text().catch(() => null);
}

/**
 * The enclave's core flow:
 *   ① redact any inlined plaintext from the task (so the remote judge never sees it)
 *   ② ask the policy judge to rule on (policy, operation, redacted task)
 *   ③ judge errored  → fail closed, no execution
 *   ④ denied         → no execution
 *   ⑤ allowed        → inject the real secret, run the upstream call, return its result
 * Every clean verdict (allow or deny) is bound to a TDX attestation quote.
 */
export async function executeRequest(
  req: ExecuteRequest,
  deps: ExecuteDeps,
): Promise<ExecuteResponse> {
  const runJudge = deps.judgeImpl ?? realJudge;
  const runAttest = deps.attestImpl ?? realAttest;
  const doFetch = deps.fetchImpl ?? fetch;

  // ① Never let inlined plaintext reach the (remote) judge.
  const redactedTask = redactTask(req.task, req.secrets);

  // ② Verdict.
  const decision = await runJudge(
    {
      policy: req.policy,
      operationRequested: req.operationRequested,
      task: redactedTask,
    },
    deps.judgeConfig,
  );

  // ③ Judge failure: fail closed, do not execute, no attestation.
  if (decision.judgeError) {
    return { allowed: false, reason: decision.reason, judgeError: true };
  }

  // ④ Policy denial: no execution, but attest the verdict.
  if (!decision.allowed) {
    const attestation = await runAttest({
      operationRequested: req.operationRequested,
      url: req.task.url,
      allowed: false,
    });
    return { allowed: false, reason: decision.reason, attestation };
  }

  // ⑤ Allowed: inject the real secret and run the call inside the enclave.
  const realTask = injectTask(req.task, req.secrets);
  const attestation = await runAttest({
    operationRequested: req.operationRequested,
    url: req.task.url,
    allowed: true,
  });

  try {
    const res = await doFetch(realTask.url, {
      method: realTask.method.toUpperCase(),
      headers: realTask.headers,
      ...(realTask.body != null ? { body: realTask.body } : {}),
    });
    return {
      allowed: true,
      reason: decision.reason,
      taskStatus: res.status,
      taskResponse: await readBody(res),
      attestation,
    };
  } catch (err) {
    return {
      allowed: true,
      reason: decision.reason,
      executionError: err instanceof Error ? err.message : String(err),
      attestation,
    };
  }
}
