/**
 * Module: Create application database if missing
 *
 * Connects to postgres maintenance DB and CREATE DATABASE named in DATABASE_URL when needed.
 */
const path = require("path");
const { Client } = require("pg");
const { loadBackendEnv } = require(path.join(__dirname, "..", "env.cjs"));

function appDatabaseConnectionStringToPostgresAdminUrl(appUrl) {
  const normalized = appUrl.replace(/^postgresql:/i, "http:");
  const u = new URL(normalized);
  u.pathname = "/postgres";
  return u.toString().replace(/^http:/i, "postgresql:");
}

function getAppDatabaseName(appUrl) {
  const normalized = appUrl.replace(/^postgresql:/i, "http:");
  const u = new URL(normalized);
  const name = (u.pathname || "").replace(/^\//, "").split("/")[0];
  return name || "postgres";
}

async function main() {
  loadBackendEnv();
  const appUrl = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  if (!appUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const dbName = getAppDatabaseName(appUrl);
  const adminUrl = appDatabaseConnectionStringToPostgresAdminUrl(appUrl);

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (rows.length === 0) {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, "")}"`);
      console.log("Created database:", dbName);
    } else {
      console.log("Database already exists:", dbName);
    }
  } finally {
    await admin.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
