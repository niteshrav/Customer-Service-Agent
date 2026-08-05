const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../../src/app.cjs");
const { createTestPool, truncateAll } = require("./test-pool.cjs");
const {
  createAgentAndLogin,
  createCustomerAndLogin,
  createManagementAndLogin,
} = require("../auth/auth-helpers.cjs");

test.describe("API — inquiry metrics / dashboard (Sprint 5, US-5 TDD)", () => {
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

  test("GET /api/metrics/inquiries requires auth", async () => {
    const res = await request(app).get("/api/metrics/inquiries").expect(401);
    assert.equal(res.body.error, "unauthorized");
  });

  test("lead sees organization-wide inquiry metrics from database", async () => {
    const lead = await createManagementAndLogin(app, pool, "m1");
    const agent = await createAgentAndLogin(app, pool, "a1");
    const agentId = (await pool.query("SELECT id FROM users WHERE email=$1", [agent.email])).rows[0].id;

    await pool.query(
      `INSERT INTO customers (customer_id, name, email, account_status) VALUES ($1,$2,$3,'active'), ($4,$5,$6,'active')`,
      ["CUST-A", "A", "a@x.com", "CUST-B", "B", "b@x.com"],
    );

    await pool.query(
      `INSERT INTO inquiries (
         inquiry_id, customer_id, received, accessible,
         issue_identified, issue_addressed, status, assigned_agent_id, customer_approved
       ) VALUES
       ('INQ-OPEN-ASSIGNED', 'CUST-A', true, true, true, false, 'open', $1, false),
       ('INQ-OPEN-UNASSIGNED', 'CUST-A', true, true, true, false, 'open', NULL, false),
       ('INQ-AWAIT-APPR', 'CUST-B', true, true, true, true, 'open', $1, false),
       ('INQ-RESOLVED', 'CUST-B', true, true, true, true, 'resolved', $1, true)`,
      [agentId],
    );
    await pool.query(
      `UPDATE inquiries SET resolved_by_agent_id = $1 WHERE inquiry_id = 'INQ-RESOLVED'`,
      [agentId],
    );

    const res = await request(app)
      .get("/api/metrics/inquiries")
      .set("Authorization", `Bearer ${lead.token}`)
      .expect(200);

    assert.equal(res.body.scope, "organization");
    assert.deepEqual(res.body.inquiries, {
      total: 4,
      open: 3,
      resolved: 1,
      open_unassigned: 1,
      awaiting_customer_approval: 1,
    });
  });

  test("agent sees metrics scoped to open assigned + resolved by them", async () => {
    const agent1 = await createAgentAndLogin(app, pool, "g1");
    const agent2 = await createAgentAndLogin(app, pool, "g2");
    const id1 = (await pool.query("SELECT id FROM users WHERE email=$1", [agent1.email])).rows[0].id;
    const id2 = (await pool.query("SELECT id FROM users WHERE email=$1", [agent2.email])).rows[0].id;

    await pool.query(
      `INSERT INTO customers (customer_id, name, email, account_status) VALUES ('C1','N','e@e.com','active')`,
    );

    await pool.query(
      `INSERT INTO inquiries (
         inquiry_id, customer_id, received, accessible,
         issue_identified, issue_addressed, status, assigned_agent_id, customer_approved, resolved_by_agent_id
       ) VALUES
       ('INQ-M1', 'C1', true, true, true, false, 'open', $1, false, NULL),
       ('INQ-M2', 'C1', true, true, true, true, 'open', $1, false, NULL),
       ('INQ-M3', 'C1', true, true, true, false, 'open', $2, false, NULL),
       ('INQ-M4', 'C1', true, true, true, true, 'resolved', $2, true, $1)`,
      [id1, id2],
    );

    const res = await request(app)
      .get("/api/metrics/inquiries")
      .set("Authorization", `Bearer ${agent1.token}`)
      .expect(200);

    assert.equal(res.body.scope, "agent_bucket");
    assert.deepEqual(res.body.inquiries, {
      total: 3,
      open: 2,
      resolved: 1,
      open_unassigned: 0,
      awaiting_customer_approval: 1,
    });
  });

  test("customer sees metrics only for their customer_id", async () => {
    const cust = await createCustomerAndLogin(app, pool, "cmet");
    const other = await createCustomerAndLogin(app, pool, "other");

    const { rows: r1 } = await pool.query(`SELECT customer_id FROM users WHERE email=$1`, [cust.email]);
    const { rows: r2 } = await pool.query(`SELECT customer_id FROM users WHERE email=$1`, [other.email]);
    const myCust = r1[0].customer_id;
    const otherCust = r2[0].customer_id;

    await pool.query(
      `INSERT INTO inquiries (
         inquiry_id, customer_id, received, accessible,
         issue_identified, issue_addressed, status, customer_approved
       ) VALUES
       ('INQ-MINE-OPEN', $1, true, true, true, false, 'open', false),
       ('INQ-MINE-DONE', $1, true, true, true, true, 'resolved', true),
       ('INQ-THEIRS', $2, true, true, true, false, 'open', false)`,
      [myCust, otherCust],
    );

    const res = await request(app)
      .get("/api/metrics/inquiries")
      .set("Authorization", `Bearer ${cust.token}`)
      .expect(200);

    assert.equal(res.body.scope, "customer");
    assert.deepEqual(res.body.inquiries, {
      total: 2,
      open: 1,
      resolved: 1,
      open_unassigned: 0,
      awaiting_customer_approval: 0,
    });
  });
});
