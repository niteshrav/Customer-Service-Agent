const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPrompt } = require("../../src/chat/promptBuilder.cjs");

test("buildPrompt appends prompt pack version line", () => {
  const { system } = buildPrompt({
    question: "What is an inquiry?",
    pathname: "/",
    role: "guest",
    mode: "llm",
    promptVersion: "v4-test",
  });
  assert.ok(system.includes("Prompt pack version: v4-test."));
  assert.ok(system.includes("CSA Assistant"), "persona name in system prompt");
});

test("buildPrompt defaults prompt version to v1", () => {
  const { system } = buildPrompt({
    question: "What is an inquiry?",
    pathname: "/",
    role: "guest",
    mode: "llm",
  });
  assert.ok(system.includes("Prompt pack version: v1."));
  assert.ok(system.includes("CSA Assistant"));
});
