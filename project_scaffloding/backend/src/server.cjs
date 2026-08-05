/**
 * Module: Process entry — HTTP server
 *
 * Loads env, creates the Postgres pool and Express app, listens on PORT (default 3101).
 * Registers SIGTERM/SIGINT handlers: stop accepting connections, close chat/Redis bundle, end pool.
 */
const path = require("path");
require(path.join(__dirname, "..", "env.cjs")).loadBackendEnv();

const { createPool } = require("./db/pool.cjs");
const { createApp, closeDefaultChatBundle } = require("./app.cjs");

const pool = createPool();
const app = createApp(pool);
const PORT = Number(process.env.PORT) || 3101;

const server = app.listen(PORT, () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});

let shuttingDown = false;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, closing HTTP server…`);
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
  try {
    await closeDefaultChatBundle();
  } catch (e) {
    console.error("closeDefaultChatBundle:", e);
  }
  try {
    await pool.end();
  } catch (e) {
    console.error("pool.end:", e);
  }
  process.exit(0);
}

process.once("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.once("SIGINT", () => void gracefulShutdown("SIGINT"));
