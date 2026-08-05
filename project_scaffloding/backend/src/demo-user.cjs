/**
 * Module: Demo user seeding
 *
 * Ensures idempotent upsert of demo agent, customer, and management users (emails/passwords from env or defaults).
 * Used by db:seed-demo so local environments have accounts matching the frontend demo hints.
 */
const bcrypt = require("bcryptjs");

const DEMO_USER_EMAIL = (process.env.DEMO_USER_EMAIL || "demo@csa.local").trim().toLowerCase(); // agent demo
const DEMO_CUSTOMER_EMAIL = (process.env.DEMO_CUSTOMER_EMAIL || "demo-customer@csa.local").trim().toLowerCase();
const DEMO_MANAGEMENT_EMAIL = (process.env.DEMO_MANAGEMENT_EMAIL || "demo-management@csa.local").trim().toLowerCase();

const DEMO_CUSTOMER_ID = process.env.DEMO_CUSTOMER_ID || "CUST-100";
const DEMO_CUSTOMER_FULL_NAME = process.env.DEMO_CUSTOMER_FULL_NAME || "Demo Customer";
const DEMO_MANAGEMENT_FULL_NAME = process.env.DEMO_MANAGEMENT_FULL_NAME || "Demo Management";
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || "Demo1!csa";
const DEMO_USER_FULL_NAME = process.env.DEMO_USER_FULL_NAME || "Demo Agent";

async function ensureDemoUser(pool) {
  const hash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);

  // Agent demo user
  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active, customer_id)
     VALUES ($1, $2, $3, 'agent', true, NULL)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       is_active = true`,
    [DEMO_USER_FULL_NAME, DEMO_USER_EMAIL, hash],
  );

  // Management demo user (lead role)
  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active, customer_id)
     VALUES ($1, $2, $3, 'lead', true, NULL)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       is_active = true`,
    [DEMO_MANAGEMENT_FULL_NAME, DEMO_MANAGEMENT_EMAIL, hash],
  );

  // Customer demo user mapped to `customers.customer_id`
  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active, customer_id)
     VALUES ($1, $2, $3, 'customer', true, $4)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       is_active = true,
       customer_id = EXCLUDED.customer_id`,
    [DEMO_CUSTOMER_FULL_NAME, DEMO_CUSTOMER_EMAIL, hash, DEMO_CUSTOMER_ID],
  );
}

module.exports = {
  DEMO_USER_EMAIL,
  DEMO_CUSTOMER_EMAIL,
  DEMO_MANAGEMENT_EMAIL,
  DEMO_CUSTOMER_ID,
  DEMO_USER_PASSWORD,
  DEMO_USER_FULL_NAME,
  ensureDemoUser,
};
