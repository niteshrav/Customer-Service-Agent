const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildRagEvidenceReply,
  isLlmDegradedResponse,
} = require("../../src/chat/ragEvidenceReply.cjs");

test("buildRagEvidenceReply returns null for empty chunks", () => {
  assert.equal(buildRagEvidenceReply([]), null);
  assert.equal(buildRagEvidenceReply(null), null);
});

test("buildRagEvidenceReply summarizes top chunk and related titles", () => {
  const reply = buildRagEvidenceReply([
    { title: "Workflow", body: "An inquiry closes only after customer approval sets status to resolved." },
    { title: "Agent playbook", body: "Agents should confirm issue addressed before requesting approval." },
  ]);
  assert.match(reply, /Workflow/);
  assert.match(reply, /customer approval/i);
  assert.match(reply, /Agent playbook/);
  assert.match(reply, /Sources below/i);
});

test("isLlmDegradedResponse detects metadata and fallback text", () => {
  assert.equal(isLlmDegradedResponse({ content: "x", response_metadata: { llm_degraded: true } }, ""), true);
  assert.equal(
    isLlmDegradedResponse({ content: "The assistant is temporarily unavailable." }, "The assistant is temporarily unavailable."),
    true,
  );
  assert.equal(isLlmDegradedResponse({ content: "Hello" }, "fallback"), false);
});
