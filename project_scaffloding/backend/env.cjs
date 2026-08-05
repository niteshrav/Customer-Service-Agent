/**
 * Module: Backend environment loader
 *
 * loadBackendEnv() loads dotenv from backend/.env or backend/config/.env (first wins, override true).
 * Exports BACKEND_ROOT for scripts resolving paths relative to the backend package.
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// env.cjs lives in `backend/`, but some callers import it from `backend/src/`.
// Use `backend/` as the base so `backend/.env` is reliably loaded.
const BACKEND_ROOT = path.join(__dirname);

function loadBackendEnv() {
  const candidates = [
    path.join(BACKEND_ROOT, ".env"),
    path.join(BACKEND_ROOT, "config", ".env"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: true });
      return p;
    }
  }
  return null;
}

module.exports = { loadBackendEnv, BACKEND_ROOT };
