const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp, closeDefaultChatBundle } = require("../../src/app.cjs");
const { createTestPool } = require("../api/test-pool.cjs");

test.describe("App lazy default chat bundle shutdown", () => {
  const pool = createTestPool();
  let prevMetricsToken;

  test.before(() => {
    prevMetricsToken = process.env.CHAT_METRICS_TOKEN;
    process.env.CHAT_METRICS_TOKEN = "test-metrics-token-bundle-close";
  });

  test.after(async () => {
    if (prevMetricsToken === undefined) delete process.env.CHAT_METRICS_TOKEN;
    else process.env.CHAT_METRICS_TOKEN = prevMetricsToken;
    await closeDefaultChatBundle();
    await pool.end();
  });

  test("metrics route materializes bundle; closeDefaultChatBundle is idempotent", async () => {
    const app = createApp(pool, {
      buildChatBundleOptions: {
        llmFactory: () => ({
          invoke: async () => ({ content: "x", usage_metadata: { total_tokens: 1 } }),
        }),
        embedQueryFactory: () => async () => {
          throw new Error("skip rag");
        },
      },
    });

    const res = await request(app)
      .get("/api/chat/metrics")
      .set("X-Chat-Metrics-Token", "test-metrics-token-bundle-close")
      .expect(200);
    assert.ok(res.body && typeof res.body.metrics === "object");

    await closeDefaultChatBundle();
    await closeDefaultChatBundle();
  });
});
