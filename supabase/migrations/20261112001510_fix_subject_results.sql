-- =============================================================================
-- NeoLevel · 1510 · subject_results fixes
--  - "assignments_due" now counts every published/closed assignment (a delivery
--    made before the deadline showed as 1/0)
--  - average score assumes a 0–10 scale when the assignment has no max_score
-- =============================================================================
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
       and asg.status in ('published', 'closed') and (asg.cohort_id is null or asg.cohort_id = e.cohort_id))::int,
    (select count(*) from public.assignment_submissions s join public.assignments asg on asg.id = s.assignment_id
       where asg.subject_id = p_subject and s.student_id = e.user_id and s.status <> 'draft')::int,
    (select round(avg(s.score / coalesce(nullif(asg.max_score, 0), 10) * 10), 1) from public.assignment_submissions s
       join public.assignments asg on asg.id = s.assignment_id
       where asg.subject_id = p_subject and s.student_id = e.user_id and s.score is not null)
  from public.subject_cohorts sc
  join public.enrollments e on e.cohort_id = sc.cohort_id and e.status in ('active', 'paused', 'completed')
  join public.profiles p on p.id = e.user_id
  join public.cohorts c on c.id = sc.cohort_id
  where sc.subject_id = p_subject
  order by p.full_name;
end $$;
