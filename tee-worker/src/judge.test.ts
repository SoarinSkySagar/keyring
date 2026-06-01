import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeminiRequest, parseJudgeDecision, judge } from "./judge";

const baseInput = {
  policy: "May read Stripe charges. Must never create or refund charges.",
  operationRequested: "List recent charges",
  task: {
    method: "GET",
    url: "https://api.stripe.com/v1/charges",
    headers: { Authorization: "Bearer {{STRIPE_KEY}}" },
  },
};

function approving(text = '{"allowed":true,"reason":"ok"}') {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200 },
  );
}

test("buildGeminiRequest puts policy, operation, method and url into the prompt", () => {
  const body = buildGeminiRequest(baseInput);
  const text = body.contents[0]!.parts[0]!.text!;
  assert.match(text, /May read Stripe charges/);
  assert.match(text, /List recent charges/);
  assert.match(text, /GET/);
  assert.match(text, /api\.stripe\.com\/v1\/charges/);
});

test("buildGeminiRequest requests structured JSON with an allowed+reason schema", () => {
  const body = buildGeminiRequest(baseInput);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.deepEqual(body.generationConfig.responseSchema.required, ["allowed", "reason"]);
  assert.equal(body.generationConfig.temperature, 0);
});

test("buildGeminiRequest never contains a raw secret value, only placeholders", () => {
  const serialized = JSON.stringify(buildGeminiRequest(baseInput));
  assert.ok(!serialized.includes("sk_live"));
  assert.match(serialized, /\{\{STRIPE_KEY\}\}/);
});

test("parseJudgeDecision extracts allowed and reason from a standard response", () => {
  const d = parseJudgeDecision({
    candidates: [{ content: { parts: [{ text: '{"allowed":true,"reason":"within policy"}' }] } }],
  });
  assert.equal(d.allowed, true);
  assert.equal(d.reason, "within policy");
  assert.equal(d.judgeError, undefined);
});

test("parseJudgeDecision skips a non-JSON thinking part and reads the JSON part", () => {
  const d = parseJudgeDecision({
    candidates: [
      {
        content: {
          parts: [
            { text: "Let me think about this...", thought: true },
            { text: '{"allowed":false,"reason":"denied"}' },
          ],
        },
      },
    ],
  });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, "denied");
  assert.equal(d.judgeError, undefined); // a genuine deny is NOT a judge error
});

test("parseJudgeDecision fails closed on empty candidates", () => {
  const d = parseJudgeDecision({ candidates: [] });
  assert.equal(d.allowed, false);
  assert.equal(d.judgeError, true);
});

test("parseJudgeDecision fails closed on non-JSON text", () => {
  const d = parseJudgeDecision({
    candidates: [{ content: { parts: [{ text: "I cannot comply" }] } }],
  });
  assert.equal(d.allowed, false);
  assert.equal(d.judgeError, true);
});

test("judge returns the approving verdict from Gemini", async () => {
  const d = await judge(baseInput, {
    apiKey: "k",
    model: "gemini-flash-latest",
    fetchImpl: async () => approving('{"allowed":true,"reason":"reading is allowed"}'),
  });
  assert.equal(d.allowed, true);
  assert.equal(d.reason, "reading is allowed");
});

test("judge sends the api key header and model in the request URL", async () => {
  let capturedUrl = "";
  let capturedHeaders: Record<string, string> = {};
  await judge(baseInput, {
    apiKey: "secret-key",
    model: "gemini-flash-latest",
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return approving();
    },
  });
  assert.match(capturedUrl, /models\/gemini-flash-latest:generateContent/);
  assert.equal(capturedHeaders["X-goog-api-key"], "secret-key");
});

test("judge fails closed on a non-200 from Gemini", async () => {
  const d = await judge(baseInput, {
    apiKey: "k",
    model: "m",
    fetchImpl: async () => new Response("upstream error", { status: 500 }),
  });
  assert.equal(d.allowed, false);
  assert.equal(d.judgeError, true);
});

test("judge fails closed when fetch throws", async () => {
  const d = await judge(baseInput, {
    apiKey: "k",
    model: "m",
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });
  assert.equal(d.allowed, false);
  assert.equal(d.judgeError, true);
});
