/**
 * Module: Database migrations CLI
 *
 * Applies all SQL files in backend/migrations/ in filename order against DATABASE_URL.
 * Run via npm run db:migrate; prints helpful errors when DATABASE_URL is missing.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { loadBackendEnv, BACKEND_ROOT } = require(path.join(__dirname, "..", "..", "env.cjs"));

const loadedFrom = loadBackendEnv();

async function main() {
  const url = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  if (!url) {
    console.error("DATABASE_URL is not set or is empty.\n");
    console.error("Do one of the following:\n");
    console.error("  1) Create a file with your connection string:");
    console.error(`     ${path.join(BACKEND_ROOT, ".env")}`);
    console.error("     or");
    console.error(`     ${path.join(BACKEND_ROOT, "config", ".env")}`);
    console.error("     with a line like:");
    console.error('     DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/customer_service_agent\n');
    console.error("  2) Or pass it for this command only:");
    console.error('     DATABASE_URL="postgresql://..." npm run db:migrate\n');
    if (loadedFrom) {
      console.error(`(An env file was loaded from ${loadedFrom}, but DATABASE_URL is still missing.)`);
    } else {
      console.error("(No .env file found in backend/ or backend/config/.)");
    }
    process.exit(1);
  }
  const dir = path.join(__dirname, "..", "..", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      await client.query(sql);
      console.log("Applied:", file);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
