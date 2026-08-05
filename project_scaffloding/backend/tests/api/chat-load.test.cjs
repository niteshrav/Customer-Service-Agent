const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../../src/app.cjs");
const { createTestPool, truncateAll } = require("./test-pool.cjs");
const { createChatService } = require("../../src/chat/createChatService.cjs");

test.describe("API — chat load smoke (Sprint 4)", () => {
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

  test(
    "sequential chat requests complete without error under mock LLM",
    { timeout: 120_000 },
    async () => {
      const llmMock = {
        invoke: async () => ({
          content: "load-ok",
          usage_metadata: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        }),
      };
      const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
      const n = 35;
      const t0 = Date.now();
      for (let i = 0; i < n; i++) {
        const res = await request(app)
          .post("/api/chat")
          .send({
            question: `Explain inquiry timeline point ${i}`,
            pathname: "/",
            mode: "llm",
          })
          .expect(200);
        assert.equal(res.body.reply, "load-ok");
        assert.ok(res.body.conversation_id);
      }
      const ms = Date.now() - t0;
      assert.ok(ms < 90_000, `expected ${n} requests in under 90s, took ${ms}ms`);
    }
  );
});
