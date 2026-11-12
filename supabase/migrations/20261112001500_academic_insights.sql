-- =============================================================================
-- NeoLevel · 1500 · Academic insights: cohort roster with risk flags,
--                    per-subject results for teachers
-- =============================================================================

create or replace function public.can_view_cohort_insights(p_cohort uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_permission('classes.view', p_user)
      or public.has_permission('students.view', p_user)
      or exists (select 1 from public.cohorts c where c.id = p_cohort and c.coordinator_id = p_user)
$$;

-- One row per Neoleader of the cohort, with the signals coordination acts on.
create or replace function public.cohort_students(p_cohort uuid)
returns table (
  user_id uuid, full_name text, avatar_url text, track public.neoleader_track, enrollment_status public.enrollment_status,
  lessons_past int, lessons_attended int, attendance_rate numeric,
  overdue_assignments int, last_activity_at timestamptz,
  venture_id uuid, venture_name text, venture_stage public.venture_stage, venture_updated_at timestamptz,
  mentor_name text, last_mentoring_at timestamptz, risk_flags text[]
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.can_view_cohort_insights(p_cohort) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
  with base as (
    select e.user_id, e.status as enrollment_status, p.full_name, p.avatar_url, np.track,
      (select count(*) from public.lessons l
        where l.cohort_id = p_cohort and l.starts_at < now() and l.status <> 'canceled')::int as lessons_past,
      (select count(*) from public.lessons l join public.attendance a on a.lesson_id = l.id and a.student_id = e.user_id
        where l.cohort_id = p_cohort and l.starts_at < now() and a.status in ('present', 'late'))::int as lessons_attended,
      (select count(*) from public.assignments asg
        join public.subject_cohorts sc on sc.subject_id = asg.subject_id and sc.cohort_id = p_cohort
        where asg.status in ('published', 'closed') and asg.due_at < now()
          and (asg.cohort_id is null or asg.cohort_id = p_cohort)
          and not exists (select 1 from public.assignment_submissions s where s.assignment_id = asg.id
                          and s.student_id = e.user_id and s.status <> 'draft'))::int as overdue,
      (select max(ae.occurred_at) from public.activity_events ae where ae.user_id = e.user_id) as last_activity,
      v.id as venture_id, v.name as venture_name, v.stage as venture_stage, v.last_update_at as venture_updated,
      (select mp.full_name from public.mentor_assignments ma join public.profiles mp on mp.id = ma.mentor_id
        where ma.student_id = e.user_id and ma.is_active order by ma.started_on limit 1) as mentor_name,
      (select max(ms.completed_at) from public.mentoring_sessions ms
        where ms.student_id = e.user_id and ms.status = 'completed') as last_mentoring
    from public.enrollments e
    join public.profiles p on p.id = e.user_id
    left join public.neoleader_profiles np on np.user_id = e.user_id
    left join public.ventures v on v.owner_id = e.user_id and v.is_primary
    where e.cohort_id = p_cohort and e.status in ('active', 'paused')
  )
  select b.user_id, b.full_name, b.avatar_url, b.track, b.enrollment_status,
    b.lessons_past, b.lessons_attended,
    case when b.lessons_past > 0 then round(100.0 * b.lessons_attended / b.lessons_past, 1) end,
    b.overdue, b.last_activity,
    b.venture_id, b.venture_name, b.venture_stage, b.venture_updated,
    b.mentor_name, b.last_mentoring,
    array_remove(array[
      case when b.lessons_past >= 3 and 100.0 * b.lessons_attended / b.lessons_past < 75 then 'low_attendance' end,
      case when b.overdue >= 2 then 'overdue_assignments' end,
      case when b.track = 'founder' and (b.venture_id is null or b.venture_updated < now() - interval '30 days') then 'stale_venture' end,
      case when b.mentor_name is null then 'no_mentor'
           when b.last_mentoring is null or b.last_mentoring < now() - interval '45 days' then 'no_recent_mentoring' end,
      case when b.last_activity is null or b.last_activity < now() - interval '21 days' then 'inactive' end
    ], null)
  from base b
  order by b.full_name;
end $$;

-- Teacher's view of a subject: attendance and deliveries per Neoleader.
create or replace function public.subject_results(p_subject uuid)
returns table (
  user_id uuid, full_name text, avatar_url text, cohort_name text,
  lessons_past int, lessons_attended int, attendance_rate numeric,
  assignments_due int, submitted int, average_score numeric
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not (public.can_teach_subject(p_subject) or public.has_permission('classes.view')) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
  select e.user_id, p.full_name, p.avatar_url, c.name,
    (select count(*) from public.lessons l where l.subject_id = p_subject and l.cohort_id = e.cohort_id
       and l.starts_at < now() and l.status <> 'canceled')::int,
    (select count(*) from public.lessons l join public.attendance a on a.lesson_id = l.id and a.student_id = e.user_id
       where l.subject_id = p_subject and l.cohort_id = e.cohort_id and l.starts_at < now()
         and a.status in ('present', 'late'))::int,
    (select round(100.0 * count(*) filter (where a.status in ('present', 'late')) / nullif(count(*), 0), 1)
       from public.lessons l left join public.attendance a on a.lesson_id = l.id and a.student_id = e.user_id
       where l.subject_id = p_subject and l.cohort_id = e.cohort_id and l.starts_at < now() and l.status <> 'canceled'),
    (select count(*) from public.assignments asg where asg.subject_id = p_subject
       and asg.status in ('published', 'closed') and (asg.cohort_id is null or asg.cohort_id = e.cohort_id)
       and asg.due_at < now())::int,
    (select count(*) from public.assignment_submissions s join public.assignments asg on asg.id = s.assignment_id
       where asg.subject_id = p_subject and s.student_id = e.user_id and s.status <> 'draft')::int,
    (select round(avg(s.score / nullif(asg.max_score, 0) * 10), 1) from public.assignment_submissions s
       join public.assignments asg on asg.id = s.assignment_id
       where asg.subject_id = p_subject and s.student_id = e.user_id and s.score is not null)
  from public.subject_cohorts sc
  join public.enrollments e on e.cohort_id = sc.cohort_id and e.status in ('active', 'paused', 'completed')
  join public.profiles p on p.id = e.user_id
  join public.cohorts c on c.id = sc.cohort_id
  where sc.subject_id = p_subject
  order by p.full_name;
end $$;
