#!/usr/bin/env bash
set -euo pipefail

# Pick Postgres bin dir (Debian packages use /usr/lib/postgresql/<ver>/bin)
PG_BIN="${PG_BIN:-}"
if [[ -z "$PG_BIN" ]]; then
  PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1)"
fi

export PGDATA="${PGDATA:-/var/lib/postgresql/data}"
POSTGRES_USER="${POSTGRES_USER:-app}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-app}"
POSTGRES_DB="${POSTGRES_DB:-appdb}"

echo "[postgres] Using PG_BIN=$PG_BIN"
echo "[postgres] PGDATA=$PGDATA"

mkdir -p "$PGDATA"
chmod 700 "$PGDATA"

# If a stale postmaster.pid exists (pid not running), remove it
if [[ -f "$PGDATA/postmaster.pid" ]]; then
  pid="$(head -n1 "$PGDATA/postmaster.pid" || true)"
  if [[ -n "${pid:-}" ]] && ! kill -0 "$pid" 2>/dev/null; then
    echo "[postgres] removing stale postmaster.pid (pid $pid not running)"
    rm -f "$PGDATA/postmaster.pid"
  fi
fi

# Initialize cluster if needed
if [[ ! -f "$PGDATA/PG_VERSION" ]]; then
  echo "[postgres] initdb..."
  "$PG_BIN/initdb" -D "$PGDATA"
fi

# Start a temporary server so we can create user/db
echo "[postgres] starting temporarily to create user/db..."
"$PG_BIN/pg_ctl" -D "$PGDATA" -o "-c listen_addresses='127.0.0.1' -p 5432" -w start

cleanup() {
  # Make sure we don't leave a running postgres behind if anything errors
  "$PG_BIN/pg_ctl" -D "$PGDATA" -m fast -w stop >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[postgres] creating role/db if not exists..."

# Create role if missing
if ! "$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U postgres -tAc \
  "SELECT 1 FROM pg_roles WHERE rolname='${POSTGRES_USER}'" | grep -q 1; then
  "$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U postgres -v ON_ERROR_STOP=1 \
    -c "CREATE ROLE ${POSTGRES_USER} LOGIN PASSWORD '${POSTGRES_PASSWORD}';"
else
  # keep password in sync (optional but useful)
  "$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U postgres -v ON_ERROR_STOP=1 \
    -c "ALTER ROLE ${POSTGRES_USER} WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';" >/dev/null
fi

# Create DB if missing (IMPORTANT: NOT inside DO $$)
if ! "$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'" | grep -q 1; then
  "$PG_BIN/createdb" -h 127.0.0.1 -p 5432 -U postgres -O "${POSTGRES_USER}" "${POSTGRES_DB}"
fi

echo "[postgres] bootstrap done; stopping temp server..."
"$PG_BIN/pg_ctl" -D "$PGDATA" -m fast -w stop
trap - EXIT

# Start Postgres in foreground (what supervisor needs)
echo "[postgres] starting in foreground..."
exec "$PG_BIN/postgres" -D "$PGDATA" -c listen_addresses='127.0.0.1' -p 5432
