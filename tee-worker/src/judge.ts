import type { JudgeDecision, Task } from "./types";

export interface JudgeInput {
  policy: string;
  operationRequested: string;
  task: Task;
}

export interface JudgeConfig {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
}

export interface GeminiRequestBody {
  systemInstruction: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
  generationConfig: {
    temperature: number;
    responseMimeType: string;
    responseSchema: {
      type: string;
      properties: Record<string, { type: string }>;
      required: string[];
    };
  };
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are a strict security policy enforcer running inside a Trusted Execution Environment for Keyring, a secrets manager for AI agents.

An autonomous agent has been granted a secret API key under a FIXED POLICY written by the key's owner, describing what the agent may and may not do. For each request you are given:
- the AGENT POLICY (authoritative — the owner's intent),
- the OPERATION REQUESTED (what the agent claims it wants to do right now),
- the STRUCTURED HTTP REQUEST that will be executed verbatim if you allow it (secret values appear only as {{PLACEHOLDERS}} — you never see them).

Decide whether the policy permits this operation. Allow ONLY if the operation clearly falls within the policy. DENY if any of these hold:
- the operation exceeds or contradicts the policy;
- the HTTP request targets a different service, host, or action than the policy permits;
- the HTTP request is inconsistent with the stated operation (e.g. a DELETE/POST when only a read was described);
- you are unsure.

Respond with JSON only, matching {"allowed": boolean, "reason": string}. The reason must be one concise sentence an auditor could read. When in doubt, deny.`;

function failClosed(reason: string): JudgeDecision {
  return { allowed: false, reason, judgeError: true };
}

export function buildGeminiRequest(input: JudgeInput): GeminiRequestBody {
  const taskView = {
    method: input.task.method,
    url: input.task.url,
    headers: input.task.headers ?? {},
    body: input.task.body ?? null,
  };

  const userText = [
    `AGENT POLICY:\n${input.policy}`,
    `OPERATION REQUESTED:\n${input.operationRequested}`,
    `STRUCTURED HTTP REQUEST (secrets shown only as {{PLACEHOLDERS}}):\n${JSON.stringify(taskView, null, 2)}`,
  ].join("\n\n");

  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { allowed: { type: "BOOLEAN" }, reason: { type: "STRING" } },
        required: ["allowed", "reason"],
      },
    },
  };
}

/**
 * Parse Gemini's response into a verdict. The model is a "thinking" model, so
 * the candidate may contain several parts; we scan for the first part whose text
 * parses as a JSON object carrying a boolean `allowed`. Anything unparseable
 * fails closed (deny + judgeError).
 */
export function parseJudgeDecision(response: unknown): JudgeDecision {
  try {
    const candidates = (response as { candidates?: unknown[] })?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return failClosed("Policy judge returned no candidates");
    }
    const parts = (candidates[0] as { content?: { parts?: unknown[] } })?.content?.parts;
    if (!Array.isArray(parts)) {
      return failClosed("Policy judge returned no content parts");
    }
    for (const part of parts) {
      const text = (part as { text?: unknown })?.text;
      if (typeof text !== "string") continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        continue;
      }
      const obj = parsed as { allowed?: unknown; reason?: unknown };
      if (obj && typeof obj.allowed === "boolean") {
        return {
          allowed: obj.allowed,
          reason: typeof obj.reason === "string" ? obj.reason : "",
        };
      }
    }
    return failClosed("Policy judge response missing a valid decision");
  } catch {
    return failClosed("Policy judge response could not be parsed");
  }
}

export async function judge(input: JudgeInput, config: JudgeConfig): Promise<JudgeDecision> {
  const doFetch = config.fetchImpl ?? fetch;
  const url = `${GEMINI_BASE}/${config.model}:generateContent`;
  try {
    const res = await doFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": config.apiKey,
      },
      body: JSON.stringify(buildGeminiRequest(input)),
    });
    if (!res.ok) {
      return failClosed(`Policy judge returned HTTP ${res.status}`);
    }
    const json = await res.json();
    return parseJudgeDecision(json);
  } catch (err) {
    return failClosed(
      `Policy judge unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
