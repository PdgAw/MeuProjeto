-- =============================================================================
-- NeoLevel · 1400 · Database timezone = America/Sao_Paulo
-- current_date, "hoje", deadlines and journey statuses follow the Florianópolis
-- calendar. timestamptz values are unaffected (always stored in UTC).
-- Applies to new connections.
-- =============================================================================
do $$
begin
  execute format('alter database %I set timezone to %L', current_database(), 'America/Sao_Paulo');
end $$;
