#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="/data/postgres"
mkdir -p "$DATA_DIR"
chown -R postgres:postgres /data

if [ ! -s "$DATA_DIR/PG_VERSION" ]; then
  echo "[postgres] initdb..."
  su -s /bin/sh postgres -c "initdb -D '$DATA_DIR'"

  # Trust auth, but only on loopback (container-internal)
  echo "listen_addresses = '127.0.0.1'" >> "$DATA_DIR/postgresql.conf"
  echo "port = 5432" >> "$DATA_DIR/postgresql.conf"
  echo "host all all 127.0.0.1/32 trust" >> "$DATA_DIR/pg_hba.conf"

  echo "[postgres] first start to create DB..."
  su -s /bin/sh postgres -c "pg_ctl -D '$DATA_DIR' -o \"-c listen_addresses=127.0.0.1 -p 5432\" -w start"

  su -s /bin/sh postgres -c "psql -v ON_ERROR_STOP=1 -d postgres <<'SQL'
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'app') THEN
    CREATE DATABASE app;
  END IF;
END
\$\$;
SQL"

  su -s /bin/sh postgres -c "pg_ctl -D '$DATA_DIR' -m fast -w stop"
fi

echo "[postgres] starting..."
exec su -s /bin/sh postgres -c "postgres -D '$DATA_DIR' -c listen_addresses=127.0.0.1 -p 5432"
