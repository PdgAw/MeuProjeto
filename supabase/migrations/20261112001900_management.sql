-- =============================================================================
-- NeoLevel · 1900 · Management: coordination overview, executive KPIs,
--   financial agreements with installments
-- =============================================================================

-- Coordination dashboard (optionally one cohort). Counts + the people behind
-- alerts that are not covered by cohort_students().
create or replace function public.management_overview(p_cohort uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_week_start timestamptz := date_trunc('week', now());
  v_result jsonb;
begin
  if not (public.has_permission('reports.view') or public.has_permission('students.view') or public.has_permission('classes.view')) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  with students as (
    select distinct e.user_id from public.enrollments e
    where e.status = 'active' and (p_cohort is null or e.cohort_id = p_cohort)
  ),
  att as (
    select count(*) as expected, count(a.*) filter (where a.status in ('present', 'late')) as ok
    from public.lessons l
    join public.enrollments e on e.cohort_id = l.cohort_id and e.status = 'active' and (p_cohort is null or e.cohort_id = p_cohort)
    left join public.attendance a on a.lesson_id = l.id and a.student_id = e.user_id
    where l.starts_at < now() and l.starts_at > now() - interval '60 days' and l.status <> 'canceled'
  ),
  overdue_mentoring as (
    select ms.id, ms.student_id, p.full_name, ms.scheduled_at from public.mentoring_sessions ms
    join public.profiles p on p.id = ms.student_id
    where ms.status = 'scheduled' and ms.scheduled_at < now() - interval '1 day' and ms.student_id in (select user_id from students)
  ),
  pending_docs as (
    select distinct p.id, p.full_name from public.documents d
    join public.profiles p on p.id in (select user_id from students)
    left join public.document_acknowledgements a on a.document_id = d.id and a.user_id = p.id
    where d.status in ('required_reading', 'signature_pending') and (d.expires_at is null or d.expires_at > now())
      and (d.owner_user_id = p.id or exists (select 1 from public.document_targets t where t.document_id = d.id
             and public.audience_match(t.target_type, t.target_id, t.role_key, p.id)))
      and ((d.status = 'required_reading' and a.read_at is null) or (d.status = 'signature_pending' and a.signed_at is null))
  )
  select jsonb_build_object(
    'neoleaders_active', (select count(*) from students),
    'cohorts_active', (select count(*) from public.cohorts where status = 'active' and (p_cohort is null or id = p_cohort)),
    'lessons_week', (select count(*) from public.lessons l where l.starts_at >= v_week_start and l.starts_at < v_week_start + interval '7 days'
                      and l.status <> 'canceled' and (p_cohort is null or l.cohort_id = p_cohort)),
    'mentorings_week', (select count(*) from public.mentoring_sessions ms where ms.scheduled_at >= v_week_start and ms.scheduled_at < v_week_start + interval '7 days'
                         and ms.status in ('scheduled', 'completed') and ms.student_id in (select user_id from students)),
    'events_upcoming', (select count(*) from public.experiences x where x.status = 'published' and x.starts_at between now() and now() + interval '30 days'
                         and (p_cohort is null or x.cohort_id is null or x.cohort_id = p_cohort)),
    'attendance_rate', (select case when expected > 0 then round(100.0 * ok / expected, 1) end from att),
    'overdue_deliveries', (select count(*) from public.assignments asg
                            join public.subject_cohorts sc on sc.subject_id = asg.subject_id and (asg.cohort_id is null or asg.cohort_id = sc.cohort_id)
                            join public.enrollments e on e.cohort_id = sc.cohort_id and e.status = 'active' and (p_cohort is null or e.cohort_id = p_cohort)
                            where asg.status in ('published', 'closed') and asg.due_at < now() and asg.due_at > now() - interval '90 days'
                              and not exists (select 1 from public.assignment_submissions s where s.assignment_id = asg.id and s.student_id = e.user_id and s.status <> 'draft')),
    'ventures_active', (select count(*) from public.ventures v where v.is_primary and v.owner_id in (select user_id from students)),
    'mentorings_overdue', (select coalesce(jsonb_agg(jsonb_build_object('user_id', student_id, 'full_name', full_name, 'session_id', id, 'scheduled_at', scheduled_at)), '[]') from overdue_mentoring),
    'documents_pending', (select coalesce(jsonb_agg(jsonb_build_object('user_id', id, 'full_name', full_name)), '[]') from pending_docs)
  ) into v_result;
  return v_result;
end $$;

-- Direction: executive KPIs for a period, with optional cohort / track / enrollment status filters.
create or replace function public.executive_kpis(
  p_from timestamptz, p_to timestamptz, p_cohort uuid default null, p_track public.neoleader_track default null,
  p_status public.enrollment_status default 'active'
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.has_permission('reports.view') then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  with st as (
    select distinct e.user_id from public.enrollments e
    left join public.neoleader_profiles np on np.user_id = e.user_id
    where (p_cohort is null or e.cohort_id = p_cohort) and (p_track is null or np.track = p_track) and (p_status is null or e.status = p_status)
  ),
  all_enr as (
    select e.status from public.enrollments e left join public.neoleader_profiles np on np.user_id = e.user_id
    where (p_cohort is null or e.cohort_id = p_cohort) and (p_track is null or np.track = p_track)
  ),
  att as (
    select count(*) as expected, count(a.*) filter (where a.status in ('present', 'late')) as ok
    from public.lessons l join public.enrollments e on e.cohort_id = l.cohort_id and e.user_id in (select user_id from st)
    left join public.attendance a on a.lesson_id = l.id and a.student_id = e.user_id
    where l.starts_at between p_from and least(p_to, now()) and l.status <> 'canceled'
  ),
  months as (select generate_series(date_trunc('month', p_from), date_trunc('month', least(p_to, now())), interval '1 month') as m)
  select jsonb_build_object(
    'neoleaders', (select count(*) from st),
    'admissions_new', (select count(*) from public.candidates c where c.created_at between p_from and p_to and (p_cohort is null or c.target_cohort_id = p_cohort)),
    'admissions_enrolled', (select count(*) from public.candidates c where c.converted_at between p_from and p_to and (p_cohort is null or c.target_cohort_id = p_cohort)),
    'retention_rate', (select case when count(*) filter (where status in ('active', 'paused', 'completed', 'dropped')) > 0
                         then round(100.0 * count(*) filter (where status in ('active', 'paused', 'completed')) / count(*) filter (where status in ('active', 'paused', 'completed', 'dropped')), 1) end from all_enr),
    'engagement_rate', (select case when count(*) > 0 then round(100.0 * count(*) filter (where exists (
                          select 1 from public.activity_events ae where ae.user_id = st.user_id and ae.occurred_at > now() - interval '14 days')) / count(*), 1) end from st),
    'attendance_rate', (select case when expected > 0 then round(100.0 * ok / expected, 1) end from att),
    'mentorings_done', (select count(*) from public.mentoring_sessions ms where ms.status = 'completed' and ms.completed_at between p_from and p_to and ms.student_id in (select user_id from st)),
    'ventures_active', (select count(*) from public.ventures v where v.is_primary and v.owner_id in (select user_id from st)),
    'ventures_by_stage', (select coalesce(jsonb_object_agg(stage, n), '{}') from (select v.stage, count(*) as n from public.ventures v where v.is_primary and v.owner_id in (select user_id from st) group by v.stage) s),
    'experiences_held', (select count(*) from public.experiences x where x.starts_at between p_from and least(p_to, now()) and x.status in ('published', 'completed')
                          and (p_cohort is null or x.cohort_id is null or x.cohort_id = p_cohort)),
    'satisfaction', (select round(avg(r.rating), 2) from public.experience_reflections r where r.rating is not null and r.created_at between p_from and p_to and r.user_id in (select user_id from st)),
    'satisfaction_responses', (select count(*) from public.experience_reflections r where r.rating is not null and r.created_at between p_from and p_to and r.user_id in (select user_id from st)),
    'cohorts_active', (select count(*) from public.cohorts where status = 'active'),
    'teachers', (select count(distinct ur.user_id) from public.user_roles ur join public.roles r on r.id = ur.role_id join public.profiles p on p.id = ur.user_id where r.key = 'teacher' and p.status in ('active', 'invited')),
    'mentors', (select count(distinct ur.user_id) from public.user_roles ur join public.roles r on r.id = ur.role_id join public.profiles p on p.id = ur.user_id where r.key = 'mentor' and p.status in ('active', 'invited')),
    'monthly', (select coalesce(jsonb_agg(jsonb_build_object(
        'month', to_char(m, 'YYYY-MM'),
        'mentorings', (select count(*) from public.mentoring_sessions ms where ms.status = 'completed' and date_trunc('month', ms.completed_at) = m and ms.student_id in (select user_id from st)),
        'attendance', (select case when count(*) > 0 then round(100.0 * count(a.*) filter (where a.status in ('present', 'late')) / count(*), 1) end
                       from public.lessons l join public.enrollments e on e.cohort_id = l.cohort_id and e.user_id in (select user_id from st)
                       left join public.attendance a on a.lesson_id = l.id and a.student_id = e.user_id
                       where date_trunc('month', l.starts_at) = m and l.starts_at < now() and l.status <> 'canceled')
      ) order by m), '[]') from months)
  ) into v;
  return v;
end $$;

-- Secretaria: contract + scholarship/discount + monthly installments, atomically.
create or replace function public.create_agreement_with_installments(
  p_student uuid, p_cohort uuid, p_total numeric, p_installments int, p_first_due date,
  p_discount_percent numeric default 0, p_discount_kind public.adjustment_kind default 'discount', p_reason text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_net numeric; v_each numeric; i int;
begin
  if not public.has_permission('finance.manage') then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_total <= 0 or p_installments < 1 then raise exception 'Valor e parcelas devem ser positivos.'; end if;
  insert into public.financial_agreements (student_id, cohort_id, total_amount, installments_count, start_date, created_by)
  values (p_student, p_cohort, p_total, p_installments, p_first_due, auth.uid()) returning id into v_id;
  if coalesce(p_discount_percent, 0) > 0 then
    insert into public.financial_adjustments (agreement_id, kind, percent, reason, valid_from, approved_by)
    values (v_id, p_discount_kind, p_discount_percent, p_reason, p_first_due, auth.uid());
  end if;
  v_net := round(p_total * (1 - coalesce(p_discount_percent, 0) / 100), 2);
  v_each := floor(v_net / p_installments * 100) / 100;
  for i in 1..p_installments loop
    insert into public.tuition_installments (agreement_id, number, due_date, amount)
    values (v_id, i, (p_first_due + make_interval(months => i - 1))::date,
            case when i = p_installments then v_net - v_each * (p_installments - 1) else v_each end);
  end loop;
  return v_id;
end $$;
