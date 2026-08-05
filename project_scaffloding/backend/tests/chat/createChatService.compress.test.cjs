const test = require("node:test");
const assert = require("node:assert/strict");
const { createChatService } = require("../../src/chat/createChatService.cjs");

test("long thread: prior turns compressed into summary line in LLM messages", async () => {
  let lastMessages = null;
  const llmMock = {
    invoke: async (messages) => {
      lastMessages = messages;
      return { content: "ok", usage_metadata: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } };
    },
  };
  const svc = createChatService({
    llm: llmMock,
    maxHistoryMessages: 6,
    historyPriorSummaryMaxChars: 400,
  });
  let conv = null;
  for (let i = 0; i < 12; i++) {
    const out = await svc.chat({
      question: `Explain inquiry resolution step ${i}`,
      pathname: "/",
      role: "guest",
      conversation_id: conv,
    });
    conv = out.conversation_id;
  }
  assert.ok(lastMessages);
  const flat = lastMessages.map((m) => String(m.content)).join("\n");
  assert.ok(flat.includes("[Earlier in this conversation]"), flat.slice(0, 600));
});
