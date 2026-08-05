/**
 * Module: Demo seed CLI (npm run db:seed-demo)
 *
 * Upserts demo customers, users, and inquiry/message rows for local testing.
 */
const path = require("path");
require(path.join(__dirname, "..", "env.cjs")).loadBackendEnv();

const { createPool } = require("../src/db/pool.cjs");
const { ensureDemoUser, DEMO_USER_EMAIL, DEMO_CUSTOMER_EMAIL, DEMO_MANAGEMENT_EMAIL } = require("../src/demo-user.cjs");
const { ensureDemoCustomers, ensureDemoData } = require("../src/demo-data.cjs");

async function main() {
  const pool = createPool();
  try {
    await ensureDemoCustomers(pool);
    await ensureDemoUser(pool);
    await ensureDemoData(pool);
    console.log("Demo ready:", { agent: DEMO_USER_EMAIL, customer: DEMO_CUSTOMER_EMAIL, management: DEMO_MANAGEMENT_EMAIL });
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
