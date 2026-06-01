// ── Shared types for the Keyring TEE worker ──────────────────────────────────

/** A fully-specified HTTP request. Secret slots use {{SECRET_NAME}} placeholders. */
export interface Task {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
}

/** Payload the Keyring server POSTs to the worker's /execute endpoint. */
export interface ExecuteRequest {
  /** The agent's stored natural-language policy (what it may / must not do). */
  policy: string;
  /** Natural-language description of what the agent wants to do this call. */
  operationRequested: string;
  /** The structured HTTP request to run if the policy permits it. */
  task: Task;
  /** Decrypted secrets, keyed by name. NEVER placed in the Gemini prompt. */
  secrets: Record<string, string>;
}

/** The judge's verdict. */
export interface JudgeDecision {
  allowed: boolean;
  reason: string;
  /** True when the verdict is a fail-closed default because the judge errored. */
  judgeError?: boolean;
}

/** TDX attestation evidence produced inside the enclave. */
export interface Attestation {
  quote: string;
  eventLog?: string;
  reportData: string;
  appId?: string;
  instanceId?: string;
}

/** Worker's response from /execute. */
export interface ExecuteResponse {
  allowed: boolean;
  reason: string;
  /** Policy judge failed to render a verdict (fail-closed). Server maps to 502. */
  judgeError?: boolean;
  /** HTTP status of the executed upstream call (present only when executed). */
  taskStatus?: number;
  /** Parsed upstream response body (present only when executed). */
  taskResponse?: unknown;
  /** Allowed, but the upstream call itself failed. Server maps to 502. */
  executionError?: string;
  attestation?: Attestation | null;
}
