const test = require("node:test");
const assert = require("node:assert/strict");
const { buildChatBundle } = require("../../src/chat/buildChatBundle.cjs");
const { createTestPool } = require("../api/test-pool.cjs");

test.describe("buildChatBundle dependency injection", () => {
  const pool = createTestPool();

  test.after(async () => {
    await pool.end();
  });

  test("injected llm and skipped RAG (embed factory throws) produce a working chatService", async () => {
    const bundle = await buildChatBundle(pool, {
      llmFactory: () => ({
        invoke: async () => ({ content: "stub-reply", usage_metadata: { total_tokens: 3 } }),
      }),
      embedQueryFactory: () => {
        throw new Error("embed disabled in unit test");
      },
    });

    const out = await bundle.chatService.chat({
      question: "What does issue_addressed mean in this app?",
      pathname: "/inquiries",
      role: "guest",
      mode: "llm",
    });
    assert.equal(out.reply, "stub-reply");
    await bundle.close();
  });
});
