-- =============================================================================
-- NeoLevel · 1700 · Ecosystem: panel evaluators see the pitched venture,
--   experience self check-in, achievements, community permission
-- =============================================================================

-- Evaluators and panel managers can open the venture behind a submitted pitch.
create or replace function public.can_view_venture(p_venture uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_venture_member(p_venture, p_user)
      or public.has_permission('ventures.view', p_user)
      or exists (select 1 from public.ventures v where v.id = p_venture and public.mentors_student(v.owner_id, p_user))
      or exists (select 1 from public.pitch_submissions s where s.venture_id = p_venture and s.status <> 'draft'
                 and (public.is_panel_evaluator(s.round_id, p_user) or public.has_permission('panels.manage', p_user)))
$$;

-- Neoleader confirms presence at an Experiência Neo (from 1h before until it ends).
create or replace function public.experience_self_check_in(p_experience uuid)
returns public.experience_registrations language plpgsql security definer set search_path = '' as $$
declare v_x public.experiences; v_row public.experience_registrations;
begin
  select * into v_x from public.experiences where id = p_experience;
  if not found then raise exception 'Experiência não encontrada.'; end if;
  if now() < v_x.starts_at - interval '1 hour' or now() > coalesce(v_x.ends_at, v_x.starts_at + interval '4 hours') then
    raise exception 'O check-in abre 1 hora antes e fecha ao fim da experiência.';
  end if;
  update public.experience_registrations set status = 'attended', checked_in_at = now()
   where experience_id = p_experience and user_id = auth.uid() and status in ('confirmed', 'attended')
  returning * into v_row;
  if v_row is null then raise exception 'Você não tem inscrição confirmada nesta experiência.' using errcode = '42501'; end if;
  return v_row;
end $$;

-- Conquistas: computed from real journey data (nothing is awarded by hand).
create or replace function public.student_achievements(p_student uuid default auth.uid())
returns table (key text, title text, description text, icon text, category text,
               current_value int, target_value int, unlocked boolean, unlocked_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_ment int; v_ment_first timestamptz; v_ment_5 timestamptz;
  v_les int; v_att int;
  v_exp int; v_exp_first timestamptz; v_refl int;
  v_venture public.ventures; v_ms int; v_first_customer timestamptz;
  v_goals int; v_pitch int; v_selected int; v_conn int;
begin
  if not public.can_view_student(p_student) then raise exception 'Sem permissão.' using errcode = '42501'; end if;

  select count(*), min(completed_at) into v_ment, v_ment_first from public.mentoring_sessions where student_id = p_student and status = 'completed';
  select completed_at into v_ment_5 from public.mentoring_sessions where student_id = p_student and status = 'completed' order by completed_at offset 4 limit 1;
  select count(*), count(*) filter (where a.status in ('present', 'late')) into v_les, v_att
    from public.lessons l join public.enrollments e on e.cohort_id = l.cohort_id and e.user_id = p_student
    left join public.attendance a on a.lesson_id = l.id and a.student_id = p_student
    where l.starts_at < now() and l.status <> 'canceled';
  select count(*), min(coalesce(r.checked_in_at, x.starts_at)) into v_exp, v_exp_first
    from public.experience_registrations r join public.experiences x on x.id = r.experience_id
    where r.user_id = p_student and (r.status = 'attended' or r.checked_in_at is not null);
  select count(*) into v_refl from public.experience_reflections where user_id = p_student and coalesce(main_learning, '') <> '';
  select * into v_venture from public.ventures where owner_id = p_student and is_primary;
  select count(*) into v_ms from public.venture_milestones where venture_id = v_venture.id and status = 'achieved';
  select achieved_at into v_first_customer from public.venture_milestones where venture_id = v_venture.id and status = 'achieved' and title = 'Primeiro cliente';
  select count(*) into v_goals from public.goals where owner_id = p_student and status = 'done';
  select count(*) filter (where s.status <> 'draft'), count(*) filter (where s.status = 'selected') into v_pitch, v_selected
    from public.pitch_submissions s join public.ventures v on v.id = s.venture_id where v.owner_id = p_student;
  select count(*) into v_conn from public.connections where status = 'accepted' and p_student in (requester_id, addressee_id);

  return query values
    ('first_mentoring', 'Primeira Neomentoria', 'Concluiu a primeira sessão com um Neomentor.', 'sparkles', 'Mentoria', least(v_ment, 1), 1, v_ment >= 1, v_ment_first),
    ('mentoring_5', 'Mentorado consistente', 'Concluiu 5 Neomentorias.', 'repeat', 'Mentoria', least(v_ment, 5), 5, v_ment >= 5, v_ment_5),
    ('attendance_90', 'Presença exemplar', 'Frequência acima de 90% (mínimo de 5 aulas).', 'calendar-check', 'Aprendizado', least(v_att, greatest(v_les, 5)), greatest(v_les, 5), v_les >= 5 and v_att * 100 >= v_les * 90, null::timestamptz),
    ('first_experience', 'Primeira Experiência Neo', 'Participou de uma Experiência Neo.', 'mountain', 'Experiências', least(v_exp, 1), 1, v_exp >= 1, v_exp_first),
    ('explorer', 'Explorador', 'Participou de 3 Experiências Neo.', 'compass', 'Experiências', least(v_exp, 3), 3, v_exp >= 3, null),
    ('reflective', 'Aprendiz reflexivo', 'Registrou 3 aprendizados após experiências.', 'lightbulb', 'Experiências', least(v_refl, 3), 3, v_refl >= 3, null),
    ('venture_created', 'Empreendedor em ação', 'Cadastrou seu negócio na NeoLevel.', 'briefcase', 'Negócio', case when v_venture.id is null then 0 else 1 end, 1, v_venture.id is not null, v_venture.created_at),
    ('mvp', 'MVP no ar', 'Levou o negócio ao estágio MVP.', 'rocket', 'Negócio', case when v_venture.stage >= 'mvp' then 1 else 0 end, 1, coalesce(v_venture.stage >= 'mvp', false),
       (select min(changed_at) from public.venture_stage_history where venture_id = v_venture.id and to_stage >= 'mvp')),
    ('traction', 'Tração', 'Levou o negócio ao estágio Tração.', 'trending-up', 'Negócio', case when v_venture.stage >= 'traction' then 1 else 0 end, 1, coalesce(v_venture.stage >= 'traction', false),
       (select min(changed_at) from public.venture_stage_history where venture_id = v_venture.id and to_stage >= 'traction')),
    ('first_customer', 'Primeiro cliente', 'Conquistou o primeiro cliente pagante.', 'handshake', 'Negócio', case when v_first_customer is null then 0 else 1 end, 1, v_first_customer is not null, v_first_customer),
    ('milestones_3', 'Marcos em sequência', 'Conquistou 3 milestones do negócio.', 'flag', 'Negócio', least(v_ms, 3), 3, v_ms >= 3, null),
    ('goals_3', 'Fazedor', 'Concluiu 3 metas.', 'target', 'Execução', least(v_goals, 3), 3, v_goals >= 3, null),
    ('pitch_submitted', 'No palco', 'Submeteu um pitch para a banca.', 'presentation', 'Bancas', least(v_pitch, 1), 1, v_pitch >= 1, null),
    ('panel_selected', 'Selecionado pela banca', 'Projeto selecionado em uma banca NeoLevel.', 'trophy', 'Bancas', least(v_selected, 1), 1, v_selected >= 1, null),
    ('networker', 'Conector', 'Fez 5 conexões na Comunidade Neo.', 'network', 'Comunidade', least(v_conn, 5), 5, v_conn >= 5, null);
end $$;

-- Directory requires community.view (individually revocable).
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.community_directory(text, text, uuid, public.venture_stage)'::regprocedure) into v_def;
  v_def := replace(v_def, 'where auth.uid() is not null', 'where auth.uid() is not null and public.has_permission(''community.view'')');
  execute v_def;
end $$;
