const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../../src/app.cjs");
const { createTestPool } = require("./test-pool.cjs");

test.describe("API — health (TDD)", () => {
  const pool = createTestPool();
  const app = createApp(pool);

  test.after(async () => {
    await pool.end();
  });

  test("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health").expect(200);
    assert.equal(res.body.ok, true);
  });

  test("GET / returns HTML explaining API vs web app (not Cannot GET /)", async () => {
    const res = await request(app).get("/").expect(200);
    assert.ok(String(res.headers["content-type"] || "").includes("html"));
    assert.ok(res.text.includes("API server"));
    assert.ok(res.text.includes("localhost:5173") || res.text.includes("web app"));
  });
});
