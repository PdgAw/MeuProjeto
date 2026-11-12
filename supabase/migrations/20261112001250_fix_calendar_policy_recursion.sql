-- =============================================================================
-- NeoLevel · 1250 · Fix: infinite recursion between calendar_events and
-- calendar_event_targets policies (each one queried the other).
-- A single SECURITY DEFINER visibility function breaks the cycle.
-- =============================================================================
create or replace function public.can_see_calendar_event(p_event uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.calendar_events e
    where e.id = p_event and (
      e.created_by = p_user
      or public.has_permission('events.manage', p_user)
      or exists (select 1 from public.calendar_event_targets t where t.event_id = e.id
                 and public.audience_match(t.target_type, t.target_id, t.role_key, p_user))
    )
  )
$$;

create or replace function public.can_edit_calendar_event(p_event uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.calendar_events e where e.id = p_event
                 and (e.created_by = p_user or public.has_permission('events.manage', p_user)))
$$;

drop policy calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events for select to authenticated
  using (public.can_see_calendar_event(id));

drop policy calendar_event_targets_select on public.calendar_event_targets;
create policy calendar_event_targets_select on public.calendar_event_targets for select to authenticated
  using (public.can_see_calendar_event(event_id));

drop policy calendar_event_targets_write on public.calendar_event_targets;
create policy calendar_event_targets_write on public.calendar_event_targets for all to authenticated
  using (public.can_edit_calendar_event(event_id))
  with check (public.can_edit_calendar_event(event_id));
