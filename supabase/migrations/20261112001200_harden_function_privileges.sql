-- =============================================================================
-- NeoLevel · 1200 · Function privilege hardening (Supabase security advisor)
-- - Visitors (anon) execute nothing: the platform is private.
-- - Trigger functions and internal jobs are not callable through the API.
--   (Triggers fire regardless of EXECUTE privilege.)
-- - Signed-in users keep EXECUTE on RPCs and on the helpers RLS policies call.
-- =============================================================================
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.prorettype = 'trigger'::regtype
           or p.proname in ('notify', 'log_activity', 'run_notification_jobs'))
  loop
    execute format('revoke execute on function %s from authenticated', f.sig);
  end loop;
end $$;
