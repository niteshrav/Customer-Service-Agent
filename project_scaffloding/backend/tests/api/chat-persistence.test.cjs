const test = require("node:test");
const assert = require("node:assert/strict");
const { createPgChatConversationStore } = require("../../src/chat/pgChatConversationStore.cjs");
const { createChatService } = require("../../src/chat/createChatService.cjs");
const { createTestPool, truncateAll } = require("./test-pool.cjs");

test.describe("API — chat Postgres persistence (Sprint 3 TDD)", () => {
  const pool = createTestPool();

  test.beforeEach(async () => {
    const client = await pool.connect();
    try {
      await truncateAll(client);
    } finally {
      client.release();
    }
  });

  test.after(async () => {
    await pool.end();
  });

  test("assistant turn stores usage in meta_json", async () => {
    const store = createPgChatConversationStore({ pool });
    const llmMock = {
      invoke: async () => ({
        content: "Grounded",
        usage_metadata: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      }),
    };
    const svc = createChatService({ llm: llmMock, conversationStore: store });
    const out = await svc.chat({
      question: "What does customer_approved mean on an inquiry?",
      pathname: "/",
      role: "guest",
    });
    const { rows } = await pool.query(
      `SELECT role, meta_json FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at`,
      [out.conversation_id]
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[1].role, "assistant");
    assert.equal(rows[1].meta_json.usage.total_tokens, 15);
    assert.ok(typeof rows[1].meta_json.usage.estimated_cost_usd === "number");
  });
});
