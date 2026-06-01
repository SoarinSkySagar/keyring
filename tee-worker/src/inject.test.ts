import { test } from "node:test";
import assert from "node:assert/strict";
import { injectSecrets, redactSecrets, injectTask, redactTask } from "./inject";

test("injectSecrets replaces a known placeholder with its value", () => {
  assert.equal(
    injectSecrets("Bearer {{STRIPE_KEY}}", { STRIPE_KEY: "sk_live_123" }),
    "Bearer sk_live_123",
  );
});

test("injectSecrets leaves unknown placeholders intact", () => {
  assert.equal(
    injectSecrets("Bearer {{MISSING}}", { STRIPE_KEY: "sk_live_123" }),
    "Bearer {{MISSING}}",
  );
});

test("injectSecrets replaces multiple and repeated placeholders", () => {
  assert.equal(injectSecrets("{{A}}-{{B}}-{{A}}", { A: "1", B: "2" }), "1-2-1");
});

test("redactSecrets replaces an inlined secret value with its placeholder", () => {
  assert.equal(
    redactSecrets("Bearer sk_live_123", { STRIPE_KEY: "sk_live_123" }),
    "Bearer {{STRIPE_KEY}}",
  );
});

test("redactSecrets scrubs every occurrence and ignores empty values", () => {
  assert.equal(
    redactSecrets("a=sk_live_1 b=sk_live_1 c=", { K: "sk_live_1", EMPTY: "" }),
    "a={{K}} b={{K}} c=",
  );
});

test("redactSecrets handles values containing regex special characters", () => {
  assert.equal(
    redactSecrets("key=a.b*c+d", { K: "a.b*c+d" }),
    "key={{K}}",
  );
});

test("injectTask injects into url, header values, and body but not header keys", () => {
  const out = injectTask(
    {
      method: "POST",
      url: "https://api.x.com/{{PATH}}",
      headers: { Authorization: "Bearer {{KEY}}" },
      body: '{"k":"{{KEY}}"}',
    },
    { KEY: "secret", PATH: "charges" },
  );
  assert.equal(out.url, "https://api.x.com/charges");
  assert.deepEqual(out.headers, { Authorization: "Bearer secret" });
  assert.equal(out.body, '{"k":"secret"}');
});

test("injectTask handles missing headers and body", () => {
  const out = injectTask({ method: "GET", url: "https://x.com/{{P}}" }, { P: "ok" });
  assert.equal(out.url, "https://x.com/ok");
});

test("redactTask scrubs inlined secrets from url, headers, and body", () => {
  const out = redactTask(
    {
      method: "POST",
      url: "https://api.x.com/charge?k=sk_live_1",
      headers: { Authorization: "Bearer sk_live_1" },
      body: "token=sk_live_1",
    },
    { KEY: "sk_live_1" },
  );
  assert.equal(out.url, "https://api.x.com/charge?k={{KEY}}");
  assert.deepEqual(out.headers, { Authorization: "Bearer {{KEY}}" });
  assert.equal(out.body, "token={{KEY}}");
});
