const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../../src/app.cjs");
const { createTestPool, truncateAll } = require("./test-pool.cjs");
const {
  createAgentAndLogin,
  createCustomerAndLogin,
} = require("../auth/auth-helpers.cjs");

test.describe("API — customer approval (TDD)", () => {
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

  test("customer approves an addressed inquiry -> status resolved + customer_approved=true", async () => {
    const agent = await createAgentAndLogin(app, pool, "1");
    const customer = await createCustomerAndLogin(app, pool, "1");

    // Load the customer_id created in `createUserAndLogin`
    const { rows: userRows } = await pool.query(
      `SELECT customer_id FROM users WHERE email = $1`,
      [customer.email],
    );
    assert.ok(userRows[0].customer_id);
    const custId = userRows[0].customer_id;

    // Create an open inquiry that is already "issue addressed" but not yet customer-approved.
    const { rows: inqRows } = await pool.query(
      `INSERT INTO inquiries (
         inquiry_id, customer_id, received, accessible,
         issue_identified, issue_addressed, status, assigned_agent_id, customer_approved
       ) VALUES ($1,$2,true,true,$3,$4,'open',$5,false)
       RETURNING id, inquiry_id, customer_id, assigned_agent_id, status, issue_addressed, customer_approved`,
      ["INQ-APP-1", custId, true, true, (await pool.query("SELECT id FROM users WHERE email=$1", [agent.email])).rows[0].id],
    );

    await request(app)
      .post(`/api/inquiries/${encodeURIComponent(inqRows[0].inquiry_id)}/approve`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({})
      .expect(200);

    const after = await pool.query(
      `SELECT status, customer_approved, resolved_by_agent_id FROM inquiries WHERE inquiry_id = $1`,
      [inqRows[0].inquiry_id],
    );
    assert.equal(after.rows[0].status, "resolved");
    assert.equal(after.rows[0].customer_approved, true);
    assert.equal(after.rows[0].resolved_by_agent_id, after.rows[0].resolved_by_agent_id); // non-null assertion handled below
    assert.ok(after.rows[0].resolved_by_agent_id);
  });

  test("customer cannot approve when issue_addressed is false", async () => {
    const agent = await createAgentAndLogin(app, pool, "2");
    const customer = await createCustomerAndLogin(app, pool, "2");

    const { rows: userRows } = await pool.query(
      `SELECT customer_id FROM users WHERE email = $1`,
      [customer.email],
    );
    const custId = userRows[0].customer_id;

    const agentId = (await pool.query("SELECT id FROM users WHERE email=$1", [agent.email])).rows[0].id;

    await pool.query(
      `INSERT INTO inquiries (
         inquiry_id, customer_id, received, accessible,
         issue_identified, issue_addressed, status, assigned_agent_id, customer_approved
       ) VALUES ($1,$2,true,true,$3,$4,'open',$5,false)`,
      ["INQ-APP-2", custId, true, false, agentId],
    );

    const res = await request(app)
      .post(`/api/inquiries/INQ-APP-2/approve`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({})
      .expect(400);

    assert.equal(res.body.error, "not_ready");
  });
});

