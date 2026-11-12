#!/usr/bin/env bash
# Rebuilds a throwaway Postgres database with the Supabase shim + all migrations.
# Usage: PGHOST=/tmp PGPORT=54329 supabase/tests/reset_local.sh [extra.sql ...]
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${DB:-neo_test}
PSQL="psql -U ${PGUSER:-postgres} -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
$PSQL -d "$DB" -f supabase/tests/supabase_shim.sql 2>/dev/null
for f in supabase/migrations/*.sql; do
  $PSQL -d "$DB" --single-transaction -f "$f" || { echo "FAILED: $f"; exit 1; }
done
for f in "$@"; do $PSQL -d "$DB" --single-transaction -f "$f" || { echo "FAILED: $f"; exit 1; }; done
echo "OK: $(ls supabase/migrations/*.sql | wc -l) migrations applied to $DB"
