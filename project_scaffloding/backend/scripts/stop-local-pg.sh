#!/usr/bin/env bash
set -euo pipefail
BACKEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="${BACKEND_ROOT}/pgdata"
if [[ ! -f "${PGDATA}/PG_VERSION" ]]; then
  echo "No cluster at ${PGDATA} (nothing to stop)."
  exit 0
fi
if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  echo "Stopping PostgreSQL (PGDATA=${PGDATA}) ..."
  pg_ctl -D "$PGDATA" stop
else
  echo "PostgreSQL is not running."
fi
