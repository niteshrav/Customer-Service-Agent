const test = require("node:test");
const assert = require("node:assert/strict");
const { createPgChatConversationStore } = require("../../src/chat/pgChatConversationStore.cjs");
const { createTestPool, truncateAll } = require("../api/test-pool.cjs");

test.describe("pgChatConversationStore (TDD)", () => {
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

  test("ensure creates conversation and appends with meta_json", async () => {
    const store = createPgChatConversationStore({ pool });
    const id = await store.ensure(null);
    assert.ok(id);
    await store.appendUser(id, "Hello");
    await store.appendAssistant(id, "Hi", { usage: { total_tokens: 3 }, flag: true });
    const { rows } = await pool.query(
      `SELECT role, content, meta_json FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at`,
      [id]
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[1].meta_json.usage.total_tokens, 3);
    assert.equal(rows[1].meta_json.flag, true);
  });

  test("listMessages returns ordered rows", async () => {
    const store = createPgChatConversationStore({ pool });
    const id = await store.ensure(null);
    await store.appendUser(id, "A");
    await store.appendAssistant(id, "B", {});
    const list = await store.listMessages(id);
    assert.equal(list.length, 2);
    assert.equal(list[0].content, "A");
    assert.equal(list[1].content, "B");
  });
});
