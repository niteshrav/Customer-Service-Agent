const { Pool } = require("pg");
const { getConnectionString, truncateAll } = require("../db/test-helpers.cjs");

function createTestPool() {
  return new Pool({ connectionString: getConnectionString(), max: 5 });
}

module.exports = { createTestPool, truncateAll };
