const test = require("node:test");
const assert = require("node:assert/strict");
const { wrapLlmWithResilience, isTransientLlmError } = require("../../src/chat/llmResilience.cjs");
const { createChatTelemetry } = require("../../src/chat/chatTelemetry.cjs");

test("isTransientLlmError detects 429/503 and network codes", () => {
  assert.equal(isTransientLlmError({ status: 429 }), true);
  assert.equal(isTransientLlmError({ status: 503 }), true);
  assert.equal(isTransientLlmError({ code: "ECONNRESET" }), true);
  assert.equal(isTransientLlmError({ message: "timeout waiting" }), true);
  assert.equal(isTransientLlmError({ status: 400 }), false);
});

test("wrapLlmWithResilience retries transient errors then succeeds", async () => {
  let calls = 0;
  const llm = {
    invoke: async () => {
      calls += 1;
      if (calls < 3) throw Object.assign(new Error("rate limit"), { status: 429 });
      return { content: "recovered" };
    },
  };
  const telemetry = createChatTelemetry();
  const w = wrapLlmWithResilience(llm, { maxAttempts: 4, baseDelayMs: 1, maxDelayMs: 10, telemetry });
  const out = await w.invoke([]);
  assert.equal(out.content, "recovered");
  assert.equal(calls, 3);
  const s = telemetry.snapshot();
  assert.equal(s.llm_retries, 2);
});

test("wrapLlmWithResilience opens circuit and short-circuits further calls", async () => {
  let calls = 0;
  const llm = {
    invoke: async () => {
      calls += 1;
      throw Object.assign(new Error("down"), { status: 503 });
    },
  };
  const telemetry = createChatTelemetry();
  const w = wrapLlmWithResilience(llm, {
    maxAttempts: 1,
    baseDelayMs: 1,
    failureThreshold: 2,
    resetTimeoutMs: 60_000,
    fallbackMessage: "FALLBACK_BODY",
    telemetry,
  });

  const a = await w.invoke([]);
  assert.equal(a.content, "FALLBACK_BODY");
  const b = await w.invoke([]);
  assert.equal(b.content, "FALLBACK_BODY");
  assert.ok(calls >= 2);

  const c = await w.invoke([]);
  assert.equal(c.content, "FALLBACK_BODY");
  assert.equal(c.response_metadata?.circuit_open, true);

  const s = telemetry.snapshot();
  assert.ok(s.circuit_opens >= 1);
  assert.ok(s.circuit_rejections >= 1);
});

test("wrapLlmWithResilience resets circuit after resetTimeoutMs", async () => {
  let calls = 0;
  const llm = {
    invoke: async () => {
      calls += 1;
      if (calls <= 2) throw Object.assign(new Error("down"), { status: 503 });
      return { content: "ok" };
    },
  };
  const telemetry = createChatTelemetry();
  const w = wrapLlmWithResilience(llm, {
    maxAttempts: 1,
    baseDelayMs: 1,
    failureThreshold: 2,
    resetTimeoutMs: 50,
    fallbackMessage: "fb",
    telemetry,
  });

  await w.invoke([]);
  await w.invoke([]);
  await new Promise((r) => setTimeout(r, 80));
  const out = await w.invoke([]);
  assert.equal(out.content, "ok");
});

test("wrapLlmWithResilience half-open probe failure re-opens circuit", async () => {
  let calls = 0;
  const llm = {
    invoke: async () => {
      calls += 1;
      throw Object.assign(new Error("down"), { status: 503 });
    },
  };
  const w = wrapLlmWithResilience(llm, {
    maxAttempts: 1,
    baseDelayMs: 1,
    failureThreshold: 2,
    resetTimeoutMs: 50,
    fallbackMessage: "fb",
  });

  await w.invoke([]);
  await w.invoke([]);
  await new Promise((r) => setTimeout(r, 80));

  const probe = await w.invoke([]);
  assert.equal(probe.content, "fb");
  assert.equal(probe.response_metadata?.circuit_half_open_failed, true);

  const rejected = await w.invoke([]);
  assert.equal(rejected.response_metadata?.circuit_open, true);
});
