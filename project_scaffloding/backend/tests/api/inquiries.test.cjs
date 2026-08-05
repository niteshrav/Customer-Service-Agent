const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../../src/app.cjs");
const { createTestPool, truncateAll } = require("./test-pool.cjs");
const { createAgentAndLogin } = require("../auth/auth-helpers.cjs");

test.describe("API — inquiries (TDD)", () => {
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

  test("GET /api/inquiries returns empty list", async () => {
    const agent = await createAgentAndLogin(app, pool, "empty");
    const res = await request(app).get("/api/inquiries").set("Authorization", `Bearer ${agent.token}`).expect(200);
    assert.deepEqual(res.body.inquiries, []);
  });

  test("GET /api/inquiries returns seeded rows", async () => {
    const agent = await createAgentAndLogin(app, pool, "seeded");
    const agentId = (await pool.query("SELECT id FROM users WHERE email=$1", [agent.email])).rows[0].id;
    await pool.query(`INSERT INTO customers (customer_id, name, email, account_status) VALUES ($1, $2, $3, 'active')`, ["CUST-1", "Ava", "ava@example.com"]);
    await pool.query(
      `INSERT INTO inquiries (inquiry_id, customer_id, issue_identified, issue_addressed, status, assigned_agent_id, customer_approved)
       VALUES ($1, $2, true, false, 'open', $3, false)`,
      ["INQ-1", "CUST-1", agentId]
    );
    const res = await request(app).get("/api/inquiries").set("Authorization", `Bearer ${agent.token}`).expect(200);
    assert.equal(res.body.inquiries.length, 1);
    assert.equal(res.body.inquiries[0].inquiry_id, "INQ-1");
  });

  test("GET /api/inquiries/:id returns 404 when missing", async () => {
    const agent = await createAgentAndLogin(app, pool, "missing");
    const res = await request(app).get("/api/inquiries/INQ-missing").set("Authorization", `Bearer ${agent.token}`).expect(404);
    assert.equal(res.body.error, "not_found");
  });

  test("GET /api/inquiries/:id returns inquiry and messages", async () => {
    const agent = await createAgentAndLogin(app, pool, "details");
    const agentId = (await pool.query("SELECT id FROM users WHERE email=$1", [agent.email])).rows[0].id;
    await pool.query(`INSERT INTO customers (customer_id, name, email, account_status) VALUES ($1, $2, $3, 'active')`, ["CUST-1", "Ava", "ava@example.com"]);
    const ins = await pool.query(
      `INSERT INTO inquiries (inquiry_id, customer_id, assigned_agent_id, status, customer_approved)
       VALUES ($1, $2, $3, 'open', false) RETURNING id`,
      ["INQ-1", "CUST-1", agentId]
    );
    await pool.query(
      `INSERT INTO inquiry_messages (inquiry_uuid, body, sender_type)
       VALUES ($1, $2, 'agent')`,
      [ins.rows[0].id, "Hello"]
    );
    const res = await request(app).get("/api/inquiries/INQ-1").set("Authorization", `Bearer ${agent.token}`).expect(200);
    assert.equal(res.body.inquiry.inquiry_id, "INQ-1");
    assert.equal(res.body.messages.length, 1);
    assert.equal(res.body.messages[0].body, "Hello");
  });

  test("POST /api/inquiries/:id/messages rejects empty body", async () => {
    const agent = await createAgentAndLogin(app, pool, "reject-empty");
    const agentId = (await pool.query("SELECT id FROM users WHERE email=$1", [agent.email])).rows[0].id;
    await pool.query(`INSERT INTO customers (customer_id, name, email, account_status) VALUES ($1, $2, $3, 'active')`, ["CUST-1", "Ava", "ava@example.com"]);
    await pool.query(
      `INSERT INTO inquiries (inquiry_id, customer_id, assigned_agent_id, status, customer_approved)
       VALUES ($1, $2, $3, 'open', false)`,
      ["INQ-1", "CUST-1", agentId]
    );
    const res = await request(app)
      .post("/api/inquiries/INQ-1/messages")
      .set("Authorization", `Bearer ${agent.token}`)
      .send({ body: "   " })
      .expect(400);
    assert.equal(res.body.error, "validation_error");
  });

  test("POST /api/inquiries/:id/messages creates message", async () => {
    const agent = await createAgentAndLogin(app, pool, "create-msg");
    const agentId = (await pool.query("SELECT id FROM users WHERE email=$1", [agent.email])).rows[0].id;
    await pool.query(`INSERT INTO customers (customer_id, name, email, account_status) VALUES ($1, $2, $3, 'active')`, ["CUST-1", "Ava", "ava@example.com"]);
    await pool.query(
      `INSERT INTO inquiries (inquiry_id, customer_id, assigned_agent_id, status, customer_approved)
       VALUES ($1, $2, $3, 'open', false)`,
      ["INQ-1", "CUST-1", agentId]
    );
    const res = await request(app)
      .post("/api/inquiries/INQ-1/messages")
      .set("Authorization", `Bearer ${agent.token}`)
      .send({ body: "Thanks for your patience." })
      .expect(201);
    assert.equal(res.body.message.body, "Thanks for your patience.");
    const get = await request(app).get("/api/inquiries/INQ-1").set("Authorization", `Bearer ${agent.token}`).expect(200);
    assert.equal(get.body.messages.length, 1);
  });

  test("GET /api/inquiries/:id/crm returns customer", async () => {
    const agent = await createAgentAndLogin(app, pool, "crm");
    const agentId = (await pool.query("SELECT id FROM users WHERE email=$1", [agent.email])).rows[0].id;
    await pool.query(`INSERT INTO customers (customer_id, name, email, account_status) VALUES ($1, $2, $3, $4)`, ["CUST-1", "Ava", "ava@example.com", "active"]);
    await pool.query(
      `INSERT INTO inquiries (inquiry_id, customer_id, assigned_agent_id, status, customer_approved)
       VALUES ($1, $2, $3, 'open', false)`,
      ["INQ-1", "CUST-1", agentId]
    );
    const res = await request(app).get("/api/inquiries/INQ-1/crm").set("Authorization", `Bearer ${agent.token}`).expect(200);
    assert.equal(res.body.customer.customer_id, "CUST-1");
    assert.equal(res.body.customer.account_status, "active");
  });
});
