const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeQuestion, buildResponseCacheKey } = require("../../src/chat/chatCacheKeys.cjs");

test("normalizeQuestion collapses whitespace and case", () => {
  assert.equal(normalizeQuestion("  Hello   World  "), "hello world");
});

test("buildResponseCacheKey is stable for same inputs", () => {
  const h = [{ role: "user", content: "a" }];
  const k1 = buildResponseCacheKey({ mode: "llm", role: "guest", pathname: "/", question: "Q?", historyMessages: h });
  const k2 = buildResponseCacheKey({ mode: "llm", role: "guest", pathname: "/", question: "Q?", historyMessages: h });
  assert.equal(k1, k2);
});

test("buildResponseCacheKey differs when history differs", () => {
  const k1 = buildResponseCacheKey({ mode: "llm", role: "guest", pathname: "/", question: "Q", historyMessages: [] });
  const k2 = buildResponseCacheKey({
    mode: "llm",
    role: "guest",
    pathname: "/",
    question: "Q",
    historyMessages: [{ role: "user", content: "prior" }],
  });
  assert.notEqual(k1, k2);
});
