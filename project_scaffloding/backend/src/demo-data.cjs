/**
 * Module: Demo inquiry / customer seed data
 *
 * Deterministic IDs and rows for customers, inquiries, and messages. Seeded into Postgres so the dashboard
 * and inquiry detail pages show consistent demo content (linked to demo agent user where needed).
 */
const { DEMO_USER_EMAIL } = require("./demo-user.cjs");
const DEMO_CUSTOMER_1 = {
  customer_id: "CUST-100",
  name: "Ava Customer",
  email: "ava_customer@example.com",
  account_status: "active",
};

const DEMO_CUSTOMER_2 = {
  customer_id: "CUST-101",
  name: "Noah Customer",
  email: "noah_customer@example.com",
  account_status: "active",
};

const DEMO_INQUIRY_1 = {
  inquiry_id: "INQ-100",
  customer_id: DEMO_CUSTOMER_1.customer_id,
  status: "open",
  customer_approved: false,
  received: true,
  accessible: true,
  issue_identified: true,
  issue_addressed: true,
};

const DEMO_INQUIRY_2 = {
  inquiry_id: "INQ-101",
  customer_id: DEMO_CUSTOMER_1.customer_id,
  status: "resolved",
  customer_approved: true,
  received: true,
  accessible: true,
  issue_identified: true,
  issue_addressed: true,
};

const DEMO_INQUIRY_IDS = [DEMO_INQUIRY_1.inquiry_id, DEMO_INQUIRY_2.inquiry_id];

async function ensureDemoCustomers(pool) {
  // Upsert customers first so customer-role users can safely reference customers.customer_id.
  await pool.query(
    `INSERT INTO customers (customer_id, name, email, account_status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (customer_id) DO UPDATE
       SET name = EXCLUDED.name,
           email = EXCLUDED.email,
           account_status = EXCLUDED.account_status`,
    [
      DEMO_CUSTOMER_1.customer_id,
      DEMO_CUSTOMER_1.name,
      DEMO_CUSTOMER_1.email,
      DEMO_CUSTOMER_1.account_status,
    ],
  );
  await pool.query(
    `INSERT INTO customers (customer_id, name, email, account_status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (customer_id) DO UPDATE
       SET name = EXCLUDED.name,
           email = EXCLUDED.email,
           account_status = EXCLUDED.account_status`,
    [
      DEMO_CUSTOMER_2.customer_id,
      DEMO_CUSTOMER_2.name,
      DEMO_CUSTOMER_2.email,
      DEMO_CUSTOMER_2.account_status,
    ],
  );
}

async function ensureDemoData(pool) {
  await pool.query("BEGIN");
  try {
    await ensureDemoCustomers(pool);

    const agent = await pool.query("SELECT id FROM users WHERE email = $1", [DEMO_USER_EMAIL]);
    const assignedAgentId = agent.rows[0]?.id ?? null;
    if (!assignedAgentId) {
      throw new Error("Demo agent user not found. Run ensureDemoUser before ensureDemoData.");
    }

    // Upsert inquiries
    await pool.query(
      `INSERT INTO inquiries (
         inquiry_id, customer_id, received, accessible,
         issue_identified, issue_addressed, status, customer_approved,
         assigned_agent_id, resolved_by_agent_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (inquiry_id) DO UPDATE SET
         customer_id = EXCLUDED.customer_id,
         received = EXCLUDED.received,
         accessible = EXCLUDED.accessible,
         issue_identified = EXCLUDED.issue_identified,
         issue_addressed = EXCLUDED.issue_addressed,
         status = EXCLUDED.status,
         customer_approved = EXCLUDED.customer_approved,
         assigned_agent_id = EXCLUDED.assigned_agent_id,
         resolved_by_agent_id = EXCLUDED.resolved_by_agent_id`,
      [
        DEMO_INQUIRY_1.inquiry_id,
        DEMO_INQUIRY_1.customer_id,
        DEMO_INQUIRY_1.received,
        DEMO_INQUIRY_1.accessible,
        DEMO_INQUIRY_1.issue_identified,
        DEMO_INQUIRY_1.issue_addressed,
        DEMO_INQUIRY_1.status,
        DEMO_INQUIRY_1.customer_approved,
        assignedAgentId,
        null,
      ],
    );
    await pool.query(
      `INSERT INTO inquiries (
         inquiry_id, customer_id, received, accessible,
         issue_identified, issue_addressed, status, customer_approved,
         assigned_agent_id, resolved_by_agent_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (inquiry_id) DO UPDATE SET
         customer_id = EXCLUDED.customer_id,
         received = EXCLUDED.received,
         accessible = EXCLUDED.accessible,
         issue_identified = EXCLUDED.issue_identified,
         issue_addressed = EXCLUDED.issue_addressed,
         status = EXCLUDED.status,
         customer_approved = EXCLUDED.customer_approved,
         assigned_agent_id = EXCLUDED.assigned_agent_id,
         resolved_by_agent_id = EXCLUDED.resolved_by_agent_id`,
      [
        DEMO_INQUIRY_2.inquiry_id,
        DEMO_INQUIRY_2.customer_id,
        DEMO_INQUIRY_2.received,
        DEMO_INQUIRY_2.accessible,
        DEMO_INQUIRY_2.issue_identified,
        DEMO_INQUIRY_2.issue_addressed,
        DEMO_INQUIRY_2.status,
        DEMO_INQUIRY_2.customer_approved,
        assignedAgentId,
        assignedAgentId,
      ],
    );

    // Delete and re-insert messages so seed is idempotent.
    await pool.query(
      `DELETE FROM inquiry_messages
       WHERE inquiry_uuid IN (SELECT id FROM inquiries WHERE inquiry_id = ANY($1))`,
      [DEMO_INQUIRY_IDS],
    );

    const inq1 = await pool.query(`SELECT id FROM inquiries WHERE inquiry_id = $1`, [DEMO_INQUIRY_1.inquiry_id]);
    const inq2 = await pool.query(`SELECT id FROM inquiries WHERE inquiry_id = $1`, [DEMO_INQUIRY_2.inquiry_id]);

    // Insert non-empty messages (CHECK length(trim(body)) > 0)
    await pool.query(
      `INSERT INTO inquiry_messages (inquiry_uuid, body, sender_type)
       VALUES ($1, $2, 'agent')`,
      [inq1.rows[0].id, "Hi Ava, thanks for reaching out. We are looking into your issue."],
    );
    await pool.query(
      `INSERT INTO inquiry_messages (inquiry_uuid, body, sender_type)
       VALUES ($1, $2, 'agent')`,
      [inq2.rows[0].id, "Hi Ava — we have addressed your issue. Awaiting your approval to close."],
    );
    await pool.query(
      `INSERT INTO inquiry_messages (inquiry_uuid, body, sender_type)
       VALUES ($1, $2, 'customer')`,
      [inq2.rows[0].id, "I approve the resolution. Please close this inquiry."],
    );

    await pool.query("COMMIT");
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }
}

module.exports = {
  DEMO_CUSTOMER_1,
  DEMO_CUSTOMER_2,
  DEMO_INQUIRY_1,
  DEMO_INQUIRY_2,
  DEMO_INQUIRY_IDS,
  ensureDemoCustomers,
  ensureDemoData,
};

