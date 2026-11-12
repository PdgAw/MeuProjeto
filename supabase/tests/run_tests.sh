#!/usr/bin/env bash
# Rebuild the local test DB and run the RLS suite (rolled back at the end).
set -euo pipefail
cd "$(dirname "$0")/../.."
supabase/tests/reset_local.sh >/dev/null
psql -U "${PGUSER:-postgres}" -d "${DB:-neo_test}" -v ON_ERROR_STOP=1 -q --single-transaction \
  -f supabase/tests/rls_test.sql 2>&1 | sed -n 's/^psql:[^ ]* NOTICE:  //p; /PASSED/p; /FAIL\|ERROR/p'
