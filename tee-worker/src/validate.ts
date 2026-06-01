import type { ExecuteRequest } from "./types";

export type ValidationResult =
  | { ok: true; value: ExecuteRequest }
  | { ok: false; error: string };

function fail(error: string): ValidationResult {
  return { ok: false, error };
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export function validateExecuteRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return fail("request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  if (!nonEmptyString(b.policy)) return fail("policy is required");
  if (!nonEmptyString(b.operationRequested)) return fail("operationRequested is required");

  if (typeof b.task !== "object" || b.task === null) return fail("task is required");
  const t = b.task as Record<string, unknown>;
  if (!nonEmptyString(t.method)) return fail("task.method is required");
  if (!nonEmptyString(t.url)) return fail("task.url is required");
  if (t.headers !== undefined && (typeof t.headers !== "object" || t.headers === null)) {
    return fail("task.headers must be an object");
  }
  if (t.body !== undefined && t.body !== null && typeof t.body !== "string") {
    return fail("task.body must be a string");
  }

  const secrets = b.secrets === undefined ? {} : b.secrets;
  if (typeof secrets !== "object" || secrets === null) return fail("secrets must be an object");

  return {
    ok: true,
    value: {
      policy: b.policy,
      operationRequested: b.operationRequested,
      task: {
        method: t.method,
        url: t.url,
        headers: t.headers as Record<string, string> | undefined,
        body: (t.body ?? null) as string | null,
      },
      secrets: secrets as Record<string, string>,
    },
  };
}
