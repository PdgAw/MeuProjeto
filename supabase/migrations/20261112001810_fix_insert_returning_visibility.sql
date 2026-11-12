-- =============================================================================
-- NeoLevel · 1810 · Fix: INSERT ... RETURNING blocked by SELECT policies
-- Some SELECT policies call a helper that looks the row up in its own table.
-- During INSERT ... RETURNING the new row is not visible to that lookup yet,
-- so the creator could not get their own row back (HTTP 403). Each policy now
-- also checks the creator/owner column directly on the row being returned.
-- =============================================================================

drop policy announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated
  using (author_id = (select auth.uid()) or public.can_manage_announcement(id) or public.is_announcement_recipient(id));

drop policy documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated
  using (created_by = (select auth.uid()) or owner_user_id = (select auth.uid()) or public.can_view_document(id));

drop policy ventures_select on public.ventures;
create policy ventures_select on public.ventures for select to authenticated
  using (owner_id = (select auth.uid()) or public.can_view_venture(id));

drop policy experiences_select on public.experiences;
create policy experiences_select on public.experiences for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.has_permission('events.manage')) or public.can_see_experience(id));

drop policy calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events for select to authenticated
  using (created_by = (select auth.uid()) or (select public.has_permission('events.manage')) or public.can_see_calendar_event(id));
