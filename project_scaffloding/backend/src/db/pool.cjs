/**
 * Module: PostgreSQL connection pool
 *
 * Reads DATABASE_URL from environment (via loadBackendEnv) and returns a pg Pool for the app and scripts.
 */
const path = require("path");
const { Pool } = require("pg");

require(path.join(__dirname, "..", "..", "env.cjs")).loadBackendEnv();

/**
 * @returns {import("pg").Pool}
 */
function createPool() {
  const url = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return new Pool({ connectionString: url, max: 10 });
}

module.exports = { createPool };
