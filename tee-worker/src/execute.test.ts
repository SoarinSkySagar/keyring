import { test } from "node:test";
import assert from "node:assert/strict";
import { executeRequest, type ExecuteDeps } from "./execute";
import type { ExecuteRequest, JudgeDecision } from "./types";

const judgeConfig = { apiKey: "k", model: "m" };

function baseReq(overrides: Partial<ExecuteRequest> = {}): ExecuteRequest {
  return {
    policy: "May read charges. Must never create charges.",
    operationRequested: "List charges",
    task: {
      method: "GET",
      url: "https://api.stripe.com/v1/charges",
      headers: { Authorization: "Bearer {{STRIPE_KEY}}" },
    },
    secrets: { STRIPE_KEY: "sk_live_secret" },
    ...overrides,
  };
}

function jsonResponse(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("denies without executing when the judge denies", async () => {
  let fetched = false;
  const deps: ExecuteDeps = {
    judgeConfig,
    judgeImpl: async () => ({ allowed: false, reason: "not permitted" }),
    attestImpl: async () => null,
    fetchImpl: async () => {
      fetched = true;
      return jsonResponse({});
    },
  };
  const res = await executeRequest(baseReq(), deps);
  assert.equal(res.allowed, false);
  assert.equal(res.reason, "not permitted");
  assert.equal(res.taskStatus, undefined);
  assert.equal(fetched, false, "upstream must NOT be called on denial");
});

test("propagates judgeError without executing", async () => {
  let fetched = false;
  const deps: ExecuteDeps = {
    judgeConfig,
    judgeImpl: async () => ({ allowed: false, reason: "judge down", judgeError: true }),
    attestImpl: async () => null,
    fetchImpl: async () => {
      fetched = true;
      return jsonResponse({});
    },
  };
  const res = await executeRequest(baseReq(), deps);
  assert.equal(res.allowed, false);
  assert.equal(res.judgeError, true);
  assert.equal(fetched, false);
});

test("on allow, injects the real secret into the upstream call and returns its status+body", async () => {
  let sentAuth: string | undefined;
  const deps: ExecuteDeps = {
    judgeConfig,
    judgeImpl: async () => ({ allowed: true, reason: "ok" }),
    attestImpl: async () => null,
    fetchImpl: async (_url, init) => {
      sentAuth = (init?.headers as Record<string, string>)?.["Authorization"];
      return jsonResponse({ charges: [] }, 200);
    },
  };
  const res = await executeRequest(baseReq(), deps);
  assert.equal(sentAuth, "Bearer sk_live_secret", "real secret must be injected before the call");
  assert.equal(res.allowed, true);
  assert.equal(res.taskStatus, 200);
  assert.deepEqual(res.taskResponse, { charges: [] });
});

test("hands the judge a redacted task, never the inlined plaintext secret", async () => {
  let judgedAuth: string | undefined;
  const deps: ExecuteDeps = {
    judgeConfig,
    judgeImpl: async (input) => {
      judgedAuth = input.task.headers?.["Authorization"];
      return { allowed: true, reason: "ok" };
    },
    attestImpl: async () => null,
    fetchImpl: async () => jsonResponse({}),
  };
  // Caller carelessly inlined the real secret instead of using a placeholder:
  await executeRequest(
    baseReq({
      task: {
        method: "GET",
        url: "https://api.stripe.com/v1/charges",
        headers: { Authorization: "Bearer sk_live_secret" },
      },
    }),
    deps,
  );
  assert.equal(judgedAuth, "Bearer {{STRIPE_KEY}}", "judge must see the redacted placeholder");
});

test("on allow but upstream failure, returns executionError and no taskStatus", async () => {
  const deps: ExecuteDeps = {
    judgeConfig,
    judgeImpl: async () => ({ allowed: true, reason: "ok" }),
    attestImpl: async () => null,
    fetchImpl: async () => {
      throw new Error("connection refused");
    },
  };
  const res = await executeRequest(baseReq(), deps);
  assert.equal(res.allowed, true);
  assert.equal(res.taskStatus, undefined);
  assert.match(res.executionError ?? "", /connection refused/);
});

test("reads a non-JSON upstream body as text", async () => {
  const deps: ExecuteDeps = {
    judgeConfig,
    judgeImpl: async () => ({ allowed: true, reason: "ok" }),
    attestImpl: async () => null,
    fetchImpl: async () =>
      new Response("plain ok", { status: 201, headers: { "content-type": "text/plain" } }),
  };
  const res = await executeRequest(baseReq(), deps);
  assert.equal(res.taskStatus, 201);
  assert.equal(res.taskResponse, "plain ok");
});

test("attaches attestation from attestImpl on an allowed+executed call", async () => {
  const fakeAttestation = {
    quote: "040002deadbeef",
    reportData: "abcd",
    appId: "app-1",
    instanceId: "inst-1",
  };
  const deps: ExecuteDeps = {
    judgeConfig,
    judgeImpl: async () => ({ allowed: true, reason: "ok" }),
    attestImpl: async () => fakeAttestation,
    fetchImpl: async () => jsonResponse({ ok: true }),
  };
  const res = await executeRequest(baseReq(), deps);
  assert.deepEqual(res.attestation, fakeAttestation);
});
