const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../../src/app.cjs");
const { createTestPool, truncateAll } = require("../api/test-pool.cjs");
const {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  ensureDemoUser,
} = require("../../src/demo-user.cjs");
const { ensureDemoCustomers, ensureDemoData, DEMO_INQUIRY_IDS } = require("../../src/demo-data.cjs");

test.describe("Seed — demo inquiry data (TDD)", () => {
  const pool = createTestPool();
  const app = createApp(pool);

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

  test("ensureDemoData seeds inquiries and messages, and dashboard list returns them", async () => {
    await ensureDemoCustomers(pool);
    await ensureDemoUser(pool);
    await ensureDemoData(pool);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD })
      .expect(200);

    const list = await request(app)
      .get("/api/inquiries")
      .set("Authorization", `Bearer ${login.body.token}`)
      .expect(200);

    assert.equal(list.body.inquiries.length, DEMO_INQUIRY_IDS.length);
    const ids = list.body.inquiries.map((i) => i.inquiry_id).sort();
    assert.deepEqual(ids, [...DEMO_INQUIRY_IDS].sort());

    // Also verify detail endpoint has messages seeded
    const detail = await request(app)
      .get(`/api/inquiries/${encodeURIComponent(DEMO_INQUIRY_IDS[0])}`)
      .set("Authorization", `Bearer ${login.body.token}`)
      .expect(200);
    assert.ok(detail.body.messages.length >= 1);
    assert.equal(detail.body.inquiry.inquiry_id, DEMO_INQUIRY_IDS[0]);
  });
});

