const test = require("node:test");
const assert = require("node:assert/strict");
const { extractUsageFromAiMessage, estimateCostUsd } = require("../../src/chat/chatUsage.cjs");

test("extractUsageFromAiMessage reads usage_metadata (LangChain)", () => {
  const u = extractUsageFromAiMessage({
    usage_metadata: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
  });
  assert.deepEqual(u, {
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15,
  });
});

test("extractUsageFromAiMessage reads response_metadata.tokenUsage", () => {
  const u = extractUsageFromAiMessage({
    response_metadata: { tokenUsage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 } },
  });
  assert.deepEqual(u, {
    prompt_tokens: 3,
    completion_tokens: 2,
    total_tokens: 5,
  });
});

test("estimateCostUsd uses gpt-4o-mini rates by default", () => {
  const cost = estimateCostUsd("gpt-4o-mini", 1_000_000, 1_000_000);
  assert.ok(cost > 0);
  assert.equal(cost, 0.15 + 0.6);
});
