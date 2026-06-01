import { test } from "node:test";
import assert from "node:assert/strict";
import { validateExecuteRequest } from "./validate";

const wellFormed = {
  policy: "May read charges.",
  operationRequested: "List charges",
  task: { method: "GET", url: "https://api.stripe.com/v1/charges", headers: { A: "1" } },
  secrets: { STRIPE_KEY: "sk_live_1" },
};

test("accepts a well-formed request and returns the typed value", () => {
  const r = validateExecuteRequest(wellFormed);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.policy, "May read charges.");
    assert.equal(r.value.task.url, "https://api.stripe.com/v1/charges");
    assert.deepEqual(r.value.secrets, { STRIPE_KEY: "sk_live_1" });
  }
});

test("rejects a non-object body", () => {
  const r = validateExecuteRequest("nope");
  assert.equal(r.ok, false);
});

test("rejects a missing policy", () => {
  const r = validateExecuteRequest({ ...wellFormed, policy: "" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /policy/);
});

test("rejects a missing operationRequested", () => {
  const { operationRequested, ...rest } = wellFormed;
  const r = validateExecuteRequest(rest);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /operationRequested/);
});

test("rejects a task with no url", () => {
  const r = validateExecuteRequest({ ...wellFormed, task: { method: "GET" } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /url/);
});

test("rejects a non-string task.body", () => {
  const r = validateExecuteRequest({
    ...wellFormed,
    task: { ...wellFormed.task, body: { not: "a string" } },
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /body/);
});

test("defaults missing secrets to an empty object", () => {
  const { secrets, ...rest } = wellFormed;
  const r = validateExecuteRequest(rest);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.value.secrets, {});
});
