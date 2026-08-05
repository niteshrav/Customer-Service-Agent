const test = require("node:test");
const assert = require("node:assert/strict");
const { createDailyTokenBudget } = require("../../src/chat/chatDailyBudget.cjs");

test("createDailyTokenBudget disabled when max is 0", () => {
  const b = createDailyTokenBudget({ maxTokensPerDay: 0 });
  assert.equal(b.isEnabled(), false);
  assert.equal(b.canProceed("any"), true);
});

test("createDailyTokenBudget canProceed and consume", () => {
  const b = createDailyTokenBudget({ maxTokensPerDay: 100 });
  assert.equal(b.isEnabled(), true);
  assert.equal(b.canProceed("u1"), true);
  b.consume("u1", 60);
  assert.equal(b.canProceed("u1"), true);
  b.consume("u1", 50);
  assert.equal(b.canProceed("u1"), false);
});

test("createDailyTokenBudget isolates keys", () => {
  const b = createDailyTokenBudget({ maxTokensPerDay: 10 });
  b.consume("a", 9);
  assert.equal(b.canProceed("a"), true);
  assert.equal(b.canProceed("b"), true);
});
