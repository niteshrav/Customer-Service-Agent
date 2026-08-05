#!/usr/bin/env bash
# Start a dedicated local PostgreSQL instance (no Docker) using Homebrew Postgres binaries.
# Data directory: backend/pgdata  | Port: 5434 (avoids default 5432)
# User: csa  Password: csa_local_dev  Database: customer_service_agent (created if missing)
set -euo pipefail

# Avoid Homebrew Postgres on macOS failing with:
#   FATAL: postmaster became multithreaded during startup
#   HINT: Set the LC_ALL environment variable to a valid locale.
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
export LANG="${LANG:-en_US.UTF-8}"

BACKEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="${BACKEND_ROOT}/pgdata"
PORT=5434
LOGFILE="${PGDATA}/postgres.log"

for bin in initdb pg_ctl pg_isready createdb; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing '$bin'. Install PostgreSQL server, e.g.: brew install postgresql@16"
    exit 1
  fi
done

if [[ ! -f "${PGDATA}/PG_VERSION" ]]; then
  echo "Initializing cluster in ${PGDATA} ..."
  mkdir -p "$PGDATA"
  PWFILE="$(mktemp)"
  printf '%s\n' 'csa_local_dev' > "$PWFILE"
  initdb -D "$PGDATA" -U csa --pwfile="$PWFILE" --encoding=UTF8 --locale=en_US.UTF-8
  rm -f "$PWFILE"
fi

# One-time network settings (avoid duplicating lines)
if ! grep -q "^port = ${PORT}" "$PGDATA/postgresql.conf" 2>/dev/null; then
  echo "port = ${PORT}" >> "$PGDATA/postgresql.conf"
fi
if ! grep -q "^listen_addresses" "$PGDATA/postgresql.conf" 2>/dev/null; then
  echo "listen_addresses = '127.0.0.1'" >> "$PGDATA/postgresql.conf"
fi

if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  echo "PostgreSQL already running (PGDATA=${PGDATA})"
else
  echo "Starting PostgreSQL on 127.0.0.1:${PORT} ..."
  pg_ctl -D "$PGDATA" -l "$LOGFILE" start
  sleep 0.5
fi

for _ in {1..40}; do
  if pg_isready -h 127.0.0.1 -p "$PORT" -U csa >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

export PGPASSWORD=csa_local_dev
createdb -h 127.0.0.1 -p "$PORT" -U csa customer_service_agent 2>/dev/null || true

echo "Ready. DATABASE_URL=postgresql://csa:csa_local_dev@127.0.0.1:${PORT}/customer_service_agent"
echo "Logs: ${LOGFILE}"
echo "Stop:  npm run db:stop-local"
