const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require(path.join(__dirname, "..", "..", "env.cjs")).loadBackendEnv();

function getConnectionString() {
  const url = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Create backend/.env (or backend/config/.env) with DATABASE_URL=postgresql://... " +
        "See backend/.env.example. Or: DATABASE_URL=... npm test"
    );
  }
  return url;
}

async function applyMigrations(client) {
  const dir = path.join(__dirname, "..", "..", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await client.query(sql);
  }
}

let migrationsAppliedForTests = false;

async function truncateAll(client) {
  if (!migrationsAppliedForTests) {
    await applyMigrations(client);
    migrationsAppliedForTests = true;
  }
  try {
    await client.query("TRUNCATE TABLE rag_document_chunks;");
  } catch (e) {
    if (e.code !== "42P01") throw e;
  }
  try {
    await client.query("TRUNCATE TABLE chat_messages, chat_conversations CASCADE;");
  } catch (e) {
    if (e.code !== "42P01") throw e;
  }
  await client.query("TRUNCATE TABLE users, customers CASCADE;");
}

module.exports = { getConnectionString, applyMigrations, truncateAll };
