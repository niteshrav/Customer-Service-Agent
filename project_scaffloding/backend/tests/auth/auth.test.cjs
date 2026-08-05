const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../../src/app.cjs");
const { createTestPool, truncateAll } = require("../api/test-pool.cjs");

test.describe("API — auth flow (TDD)", () => {
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

  test("POST /api/auth/register creates account", async () => {
    const res = await request(app).post("/api/auth/register").send({
      full_name: "Nitesh Rav",
      email: "nitesh@example.com",
      password: "Strong@123",
    }).expect(201);
    assert.equal(res.body.message, "Registration successful");
  });

  test("register rejects weak password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      full_name: "Weak",
      email: "weak@example.com",
      password: "weak123",
    }).expect(400);
    assert.equal(res.body.error, "validation_error");
  });

  test("POST /api/auth/login returns token", async () => {
    await request(app).post("/api/auth/register").send({
      full_name: "A",
      email: "a@example.com",
      password: "Strong@123",
    }).expect(201);

    const login = await request(app).post("/api/auth/login").send({
      email: "a@example.com",
      password: "Strong@123",
    }).expect(200);

    assert.ok(typeof login.body.token === "string" && login.body.token.length > 10);
    assert.equal(login.body.user.email, "a@example.com");
  });

  test("GET /api/auth/me works with bearer token", async () => {
    await request(app).post("/api/auth/register").send({
      full_name: "B",
      email: "b@example.com",
      password: "Strong@123",
    }).expect(201);
    const login = await request(app).post("/api/auth/login").send({
      email: "b@example.com",
      password: "Strong@123",
    }).expect(200);

    const me = await request(app).get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`)
      .expect(200);
    assert.equal(me.body.user.email, "b@example.com");
  });

  test("protected route requires auth", async () => {
    await request(app).get("/api/inquiries").expect(401);
  });
});
