-- =============================================================================
-- NeoLevel · 1600 · Neomentoria: mentee cards for the Neomentor dashboard,
--                    private storage for session files
-- =============================================================================

-- One row per active mentee of a Neomentor (default: the caller).
create or replace function public.mentor_mentees(p_mentor uuid default auth.uid())
returns table (
  student_id uuid, full_name text, avatar_url text, track public.neoleader_track, cohort_name text, focus text,
  venture_id uuid, venture_name text, venture_stage public.venture_stage, venture_updated_at timestamptz,
  last_session_at timestamptz, next_session_at timestamptz, next_session_id uuid, pending_requests int,
  open_goals int, open_steps int, overdue_steps int, flags text[]
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if p_mentor is distinct from auth.uid() and not public.has_permission('mentoring.view') then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
  with base as (
    select ma.student_id, ma.focus, p.full_name, p.avatar_url, np.track,
      (select c.name from public.enrollments e join public.cohorts c on c.id = e.cohort_id
        where e.user_id = ma.student_id and e.status = 'active' order by e.enrolled_at desc limit 1) as cohort_name,
      v.id as venture_id, v.name as venture_name, v.stage as venture_stage, v.last_update_at as venture_updated,
      (select max(ms.completed_at) from public.mentoring_sessions ms
        where ms.student_id = ma.student_id and ms.mentor_id = p_mentor and ms.status = 'completed') as last_session,
      (select ms.scheduled_at from public.mentoring_sessions ms
        where ms.student_id = ma.student_id and ms.mentor_id = p_mentor and ms.status = 'scheduled' and ms.scheduled_at >= now()
        order by ms.scheduled_at limit 1) as next_session,
      (select ms.id from public.mentoring_sessions ms
        where ms.student_id = ma.student_id and ms.mentor_id = p_mentor and ms.status = 'scheduled' and ms.scheduled_at >= now()
        order by ms.scheduled_at limit 1) as next_session_id,
      (select count(*) from public.mentoring_sessions ms
        where ms.student_id = ma.student_id and ms.mentor_id = p_mentor and ms.status = 'requested')::int as requests,
      (select count(*) from public.goals g where g.owner_id = ma.student_id and g.status in ('not_started', 'in_progress', 'blocked'))::int as goals,
      (select count(*) from public.mentoring_action_items ai where ai.student_id = ma.student_id and ai.status = 'open')::int as steps,
      (select count(*) from public.mentoring_action_items ai where ai.student_id = ma.student_id and ai.status = 'open'
        and ai.due_date < current_date)::int as overdue
    from public.mentor_assignments ma
    join public.profiles p on p.id = ma.student_id
    left join public.neoleader_profiles np on np.user_id = ma.student_id
    left join public.ventures v on v.owner_id = ma.student_id and v.is_primary
    where ma.mentor_id = p_mentor and ma.is_active
  )
  select b.student_id, b.full_name, b.avatar_url, b.track, b.cohort_name, b.focus,
    b.venture_id, b.venture_name, b.venture_stage, b.venture_updated,
    b.last_session, b.next_session, b.next_session_id, b.requests, b.goals, b.steps, b.overdue,
    array_remove(array[
      case when b.requests > 0 then 'pending_request' end,
      case when b.last_session is null or b.last_session < now() - interval '30 days' then 'no_recent_session' end,
      case when b.next_session is null then 'nothing_scheduled' end,
      case when b.overdue > 0 then 'overdue_steps' end,
      case when b.track = 'founder' and (b.venture_id is null or b.venture_updated < now() - interval '30 days') then 'stale_venture' end
    ], null)
  from base b
  order by b.full_name;
end $$;

-- Session files: mentoring/<session_id>/<file>
insert into storage.buckets (id, name, public, file_size_limit)
values ('mentoring', 'mentoring', false, 26214400)
on conflict (id) do nothing;

create or replace function public.can_access_session_files(p_session uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mentoring_sessions s where s.id = p_session
                 and (s.student_id = p_user or s.mentor_id = p_user or public.has_permission('mentoring.manage', p_user)))
$$;

create policy neo_mentoring_read on storage.objects for select to authenticated
  using (bucket_id = 'mentoring' and public.can_access_session_files(public.try_uuid((storage.foldername(name))[1])));
create policy neo_mentoring_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'mentoring' and public.can_access_session_files(public.try_uuid((storage.foldername(name))[1])));
create policy neo_mentoring_delete on storage.objects for delete to authenticated
  using (bucket_id = 'mentoring' and owner = (select auth.uid()));

-- Neoleaders may attach files to their own sessions (files column only).
create or replace function public.add_session_files(p_session uuid, p_files jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_access_session_files(p_session) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  update public.mentoring_sessions set files = files || coalesce(p_files, '[]'::jsonb) where id = p_session;
end $$;
