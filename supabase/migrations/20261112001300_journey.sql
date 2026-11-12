-- =============================================================================
-- NeoLevel · 1300 · Minha Jornada: timeline + "Seu próximo nível"
-- =============================================================================

-- Requirement DSL used in journey_milestones.requirements:
--   {"label": "...", "type": "checkpoint",    "key": "mvp"}
--   {"label": "...", "type": "venture_stage", "stage": "mvp"}
--   {"label": "...", "type": "mentorings",    "count": 3}
--   {"label": "...", "type": "milestone",     "title": "Primeiro cliente"}
--   {"label": "...", "type": "attendance",    "min": 75}
create or replace function public.journey_requirement_met(p_student uuid, p_req jsonb)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_total int; v_ok int;
begin
  case p_req ->> 'type'
    when 'checkpoint' then
      return exists (
        select 1 from public.neoleader_checkpoints nc
        join public.track_checkpoints tc on tc.id = nc.checkpoint_id
        where nc.user_id = p_student and tc.key = p_req ->> 'key' and nc.status = 'done');
    when 'venture_stage' then
      return exists (
        select 1 from public.ventures v
        where v.owner_id = p_student and v.is_primary and v.stage >= (p_req ->> 'stage')::public.venture_stage);
    when 'mentorings' then
      return (select count(*) from public.mentoring_sessions
              where student_id = p_student and status = 'completed') >= coalesce((p_req ->> 'count')::int, 1);
    when 'milestone' then
      return exists (
        select 1 from public.venture_milestones m join public.ventures v on v.id = m.venture_id
        where v.owner_id = p_student and m.status = 'achieved' and m.title = p_req ->> 'title');
    when 'attendance' then
      select count(*), count(*) filter (where a.status in ('present', 'late')) into v_total, v_ok
      from public.lessons l
      join public.enrollments e on e.cohort_id = l.cohort_id and e.user_id = p_student
      left join public.attendance a on a.lesson_id = l.id and a.student_id = p_student
      where l.starts_at < now() and l.status <> 'canceled';
      return v_total = 0 or 100.0 * v_ok / v_total >= coalesce((p_req ->> 'min')::numeric, 75);
    else
      return false;
  end case;
end $$;

create or replace function public.student_journey(p_student uuid default auth.uid())
returns table (
  item_id uuid, source text, kind public.journey_item_kind, title text, description text,
  starts_on date, ends_on date, status text, requirements jsonb, completed_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.can_view_student(p_student) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  return query
  with my_cohorts as (
    select cohort_id from public.enrollments where user_id = p_student and status in ('active', 'completed')
  ),
  -- 1. Program milestones configured by coordination
  configured as (
    select jm.*,
      (select coalesce(jsonb_agg(r || jsonb_build_object('met', public.journey_requirement_met(p_student, r))), '[]'::jsonb)
         from jsonb_array_elements(jm.requirements) r) as reqs,
      (select jc.completed_at from public.journey_completions jc
        where jc.milestone_id = jm.id and jc.user_id = p_student) as done_at,
      exists (select 1 from public.experience_registrations er
              where er.experience_id = jm.experience_id and er.user_id = p_student
                and (er.status = 'attended' or er.checked_in_at is not null)) as exp_attended,
      exists (select 1 from public.pitch_submissions ps join public.ventures v on v.id = ps.venture_id
              where ps.round_id = jm.panel_round_id and v.owner_id = p_student
                and ps.status in ('evaluated', 'selected', 'not_selected')) as panel_done
    from public.journey_milestones jm
    where jm.cohort_id is null or jm.cohort_id in (select cohort_id from my_cohorts)
  )
  select c.id, 'journey_milestone', c.kind, c.title, c.description, c.planned_start, c.planned_end,
    case
      when c.done_at is not null or c.exp_attended or c.panel_done then 'completed'
      when exists (select 1 from jsonb_array_elements(c.reqs) r where not (r ->> 'met')::boolean)
           and coalesce(c.planned_start, current_date) <= current_date then 'blocked'
      when c.planned_end is not null and c.planned_end < current_date then 'completed'
      when c.planned_start is not null and c.planned_start <= current_date then 'in_progress'
      else 'upcoming'
    end,
    c.reqs, c.done_at
  from configured c

  union all
  -- 2. Subjects of the student's cohorts (not already represented by a configured milestone)
  select s.id, 'subject', 'subject'::public.journey_item_kind, s.name, s.description, s.starts_on, s.ends_on,
    case
      when s.status = 'completed' or (s.ends_on is not null and s.ends_on < current_date) then 'completed'
      when s.starts_on is not null and s.starts_on <= current_date then 'in_progress'
      when s.starts_on is null and exists (select 1 from public.lessons l where l.subject_id = s.id
                                             and l.cohort_id in (select cohort_id from my_cohorts)
                                             and l.starts_at <= now()) then 'in_progress'
      else 'upcoming'
    end,
    '[]'::jsonb, null::timestamptz
  from public.subjects s
  where s.status <> 'archived'
    and exists (select 1 from public.subject_cohorts sc where sc.subject_id = s.id and sc.cohort_id in (select cohort_id from my_cohorts))
    and not exists (select 1 from configured c where c.subject_id = s.id)

  union all
  -- 3. Experiences the student signed up for
  select x.id, 'experience',
    case when x.category = 'company_visit' then 'company_visit' else 'experience' end::public.journey_item_kind,
    x.title, x.description, (x.starts_at at time zone 'America/Sao_Paulo')::date,
    (coalesce(x.ends_at, x.starts_at) at time zone 'America/Sao_Paulo')::date,
    case when x.starts_at < now() and (r.status = 'attended' or r.checked_in_at is not null) then 'completed'
         when x.starts_at < now() then 'blocked'
         else 'upcoming' end,
    '[]'::jsonb, r.checked_in_at
  from public.experience_registrations r
  join public.experiences x on x.id = r.experience_id
  where r.user_id = p_student and r.status in ('confirmed', 'attended')
    and not exists (select 1 from configured c where c.experience_id = x.id)

  union all
  -- 4. Pitch panels
  select ps.id, 'pitch_submission', 'panel'::public.journey_item_kind, 'Banca: ' || pr.name, null,
    (coalesce(ps.panel_at, pr.panel_date) at time zone 'America/Sao_Paulo')::date, null,
    case when ps.status in ('evaluated', 'selected', 'not_selected') then 'completed'
         when ps.status in ('submitted', 'in_review', 'panel_scheduled') then 'in_progress'
         else 'upcoming' end,
    '[]'::jsonb, null
  from public.pitch_submissions ps
  join public.panel_rounds pr on pr.id = ps.round_id
  join public.ventures v on v.id = ps.venture_id
  where v.owner_id = p_student
    and not exists (select 1 from configured c where c.panel_round_id = ps.round_id)

  union all
  -- 5. Venture milestones achieved
  select m.id, 'venture_milestone', 'milestone'::public.journey_item_kind, m.title, v.name,
    (m.achieved_at at time zone 'America/Sao_Paulo')::date, null, 'completed', '[]'::jsonb, m.achieved_at
  from public.venture_milestones m join public.ventures v on v.id = m.venture_id
  where v.owner_id = p_student and m.status = 'achieved'

  order by 6 nulls last, 4;
end $$;
