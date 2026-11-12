#!/usr/bin/env bash
# Applies pending supabase/migrations/*.sql to a hosted Supabase project through the
# Management API (HTTPS only — no direct Postgres connection needed).
# Each migration runs as a single implicit transaction and is recorded in
# supabase_migrations.schema_migrations, so the Supabase CLI stays in sync.
#
# Usage: SUPABASE_PROJECT_REF=<ref> SUPABASE_ACCESS_TOKEN=sbp_... supabase/scripts/apply_remote.sh
#        (the token may also be injected by a proxy; then omit SUPABASE_ACCESS_TOKEN)
set -euo pipefail
cd "$(dirname "$0")/../.."
REF="${SUPABASE_PROJECT_REF:?set SUPABASE_PROJECT_REF}"
API="https://api.supabase.com/v1/projects/$REF/database/query"
AUTH=()
[ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")

run_sql() {  # $1 = SQL text; prints the JSON response, fails on HTTP error
  local body code out
  body=$(python3 -c 'import json,sys; print(json.dumps({"query": sys.stdin.read()}))' <<<"$1")
  out=$(mktemp)
  code=$(curl -sS -o "$out" -w '%{http_code}' -X POST "$API" "${AUTH[@]}" \
         -H 'Content-Type: application/json' --data-binary "$body")
  cat "$out"; rm -f "$out"
  [[ "$code" =~ ^2 ]] || { echo; echo "HTTP $code" >&2; return 1; }
}

run_sql "create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);" >/dev/null

applied=$(run_sql "select coalesce(json_agg(version), '[]') as v from supabase_migrations.schema_migrations" \
          | python3 -c 'import json,sys; print(" ".join(json.load(sys.stdin)[0]["v"]))')

for f in supabase/migrations/*.sql; do
  base=$(basename "$f" .sql); version=${base%%_*}; name=${base#*_}
  if [[ " $applied " == *" $version "* ]]; then echo "skip   $base"; continue; fi
  echo -n "apply  $base ... "
  sql="$(cat "$f")
insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name');"
  if run_sql "$sql" >/dev/null; then echo "ok"; else echo "FAILED"; exit 1; fi
done
echo "Done."
