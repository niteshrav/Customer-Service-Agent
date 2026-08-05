const request = require("supertest");
const bcrypt = require("bcryptjs");

async function registerAndLogin(app, suffix = "1") {
  // Registration creates a `customer` role account.
  const email = `cust${suffix}@example.com`;
  const password = "Strong@123";
  await request(app).post("/api/auth/register").send({
    full_name: `Customer ${suffix}`,
    email,
    password,
  }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return { token: login.body.token, email, password };
}

async function createUserAndLogin(app, pool, { role, full_name, email, password, customer_id = null }) {
  const hash = await bcrypt.hash(password, 10);
  if (role === "customer") {
    // Ensure a CRM-like customer record exists for customer filtering.
    if (!customer_id) {
      customer_id = `CUST-${Math.random().toString(16).slice(2)}`;
    }
    await pool.query(
      `INSERT INTO customers (customer_id, name, email, account_status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (customer_id) DO UPDATE
         SET name = EXCLUDED.name, email = EXCLUDED.email, account_status = EXCLUDED.account_status`,
      [customer_id, full_name, email],
    );
  }

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active, customer_id)
     VALUES ($1, $2, $3, $4, true, $5)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       is_active = true,
       customer_id = EXCLUDED.customer_id`,
    [full_name, email, hash, role, customer_id],
  );

  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return { token: login.body.token, email, password };
}

async function createAgentAndLogin(app, pool, suffix = "1") {
  return createUserAndLogin(app, pool, {
    role: "agent",
    full_name: `Agent ${suffix}`,
    email: `agent${suffix}@example.com`,
    password: "Strong@123",
  });
}

async function createCustomerAndLogin(app, pool, suffix = "1") {
  const password = "Strong@123";
  const email = `cust${suffix}@example.com`;
  const full_name = `Customer ${suffix}`;
  // We'll create both `customers` record + `users` row.
  return createUserAndLogin(app, pool, {
    role: "customer",
    full_name,
    email,
    password,
  });
}

async function createManagementAndLogin(app, pool, suffix = "1") {
  return createUserAndLogin(app, pool, {
    role: "lead",
    full_name: `Management ${suffix}`,
    email: `lead${suffix}@example.com`,
    password: "Strong@123",
  });
}

module.exports = { registerAndLogin, createUserAndLogin, createAgentAndLogin, createCustomerAndLogin, createManagementAndLogin };
