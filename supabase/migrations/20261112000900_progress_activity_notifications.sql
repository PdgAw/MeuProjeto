-- =============================================================================
-- NeoLevel · 0900 · Notifications, activity timeline, Neo Progress, journey,
--                    current user context
-- =============================================================================

-- ------------------------------------------------------------ Notifications ---
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,            -- message | lesson_new | lesson_changed | mentoring_new | mentoring_soon
                                 -- assignment_new | deadline_soon | document_new | announcement | ...
  title text not null,
  body text,
  link text,                     -- in-app route, e.g. /mentorias/<id>
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- Web Push (prepared; delivery worker comes later)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- {"<type>": {"in_app": true, "email": false, "push": true}}
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Internal helper — not callable from the API.
create or replace function public.notify(
  p_user uuid, p_type text, p_title text, p_body text default null, p_link text default null, p_data jsonb default '{}'
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = auth.uid() then return; end if;
  if coalesce((select (np.settings -> p_type ->> 'in_app')::boolean
               from public.notification_preferences np where np.user_id = p_user), true) is false then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, link, data)
  values (p_user, p_type, p_title, p_body, p_link, coalesce(p_data, '{}'));
end $$;
revoke execute on function public.notify(uuid, text, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.mark_all_notifications_read()
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;

-- Event triggers ----------------------------------------------------------------
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_sender text;
begin
  select full_name into v_sender from public.profiles where id = new.sender_id;
  for r in select m.user_id from public.conversation_members m
           where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id and not m.is_muted
             -- one unread chat notification per conversation is enough
             and not exists (select 1 from public.notifications n where n.user_id = m.user_id and n.type = 'message'
                             and n.read_at is null and n.data ->> 'conversation_id' = new.conversation_id::text)
  loop
    perform public.notify(r.user_id, 'message', 'Nova mensagem de ' || coalesce(v_sender, 'NeoLevel'),
                          left(new.body, 140), '/chat/' || new.conversation_id,
                          jsonb_build_object('conversation_id', new.conversation_id));
  end loop;
  return new;
end $$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_on_message();

create or replace function public.notify_on_lesson()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_type text; v_title text;
begin
  if tg_op = 'INSERT' then
    v_type := 'lesson_new'; v_title := 'Nova aula: ' || new.title;
  elsif new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at
        or new.room is distinct from old.room or new.location is distinct from old.location
        or (new.status = 'canceled' and old.status <> 'canceled') then
    v_type := 'lesson_changed';
    v_title := case when new.status = 'canceled' then 'Aula cancelada: ' else 'Aula alterada: ' end || new.title;
  else
    return new;
  end if;
  for r in select user_id from public.enrollments where cohort_id = new.cohort_id and status = 'active' loop
    perform public.notify(r.user_id, v_type, v_title,
                          to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI'),
                          '/aulas/' || new.id, jsonb_build_object('lesson_id', new.id));
  end loop;
  return new;
end $$;
create trigger lessons_notify after insert or update on public.lessons
  for each row execute function public.notify_on_lesson();

create or replace function public.notify_on_mentoring()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'requested' then
    perform public.notify(new.mentor_id, 'mentoring_requested', 'Nova solicitação de mentoria',
                          new.request_note, '/mentorias/' || new.id, jsonb_build_object('session_id', new.id));
  elsif new.status = 'scheduled' and (tg_op = 'INSERT' or old.status <> 'scheduled'
                                      or new.scheduled_at is distinct from old.scheduled_at) then
    perform public.notify(new.student_id, 'mentoring_new', 'Mentoria agendada',
                          to_char(new.scheduled_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI'),
                          '/mentorias/' || new.id, jsonb_build_object('session_id', new.id));
  end if;
  return new;
end $$;
create trigger mentoring_notify after insert or update on public.mentoring_sessions
  for each row execute function public.notify_on_mentoring();

create or replace function public.notify_on_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    for r in select distinct e.user_id from public.subject_cohorts sc
             join public.enrollments e on e.cohort_id = sc.cohort_id and e.status = 'active'
             where sc.subject_id = new.subject_id and (new.cohort_id is null or sc.cohort_id = new.cohort_id)
    loop
      perform public.notify(r.user_id, 'assignment_new', 'Nova atividade: ' || new.title,
                            case when new.due_at is not null then 'Prazo: ' ||
                              to_char(new.due_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') end,
                            '/entregas/' || new.id, jsonb_build_object('assignment_id', new.id));
    end loop;
  end if;
  return new;
end $$;
create trigger assignments_notify after insert or update of status on public.assignments
  for each row execute function public.notify_on_assignment();

create or replace function public.notify_on_document_target()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_title text;
begin
  select title into v_title from public.documents where id = new.document_id;
  for r in select p.id from public.profiles p where p.status = 'active'
             and public.audience_match(new.target_type, new.target_id, new.role_key, p.id)
             and not exists (select 1 from public.notifications n where n.user_id = p.id and n.type = 'document_new'
                             and n.data ->> 'document_id' = new.document_id::text)
  loop
    perform public.notify(r.id, 'document_new', 'Novo documento: ' || v_title, null,
                          '/documentos/' || new.document_id, jsonb_build_object('document_id', new.document_id));
  end loop;
  return new;
end $$;
create trigger document_targets_notify after insert on public.document_targets
  for each row execute function public.notify_on_document_target();

-- Scheduled jobs: published-but-future announcements, upcoming mentoring, deadlines.
alter table public.announcements add column notified_at timestamptz;
alter table public.mentoring_sessions add column reminder_sent_at timestamptz;

create or replace function public.run_notification_jobs()
returns void language plpgsql security definer set search_path = '' as $$
declare a record; r record;
begin
  -- Announcements whose publish time has arrived
  for a in select * from public.announcements
           where status = 'published' and publish_at <= now() and notified_at is null for update skip locked
  loop
    for r in select p.id from public.profiles p where p.status = 'active'
               and exists (select 1 from public.announcement_targets t where t.announcement_id = a.id
                           and public.audience_match(t.target_type, t.target_id, t.role_key, p.id))
    loop
      perform public.notify(r.id, 'announcement', a.title, left(a.body, 140), '/comunicados/' || a.id,
                            jsonb_build_object('announcement_id', a.id, 'urgent', a.type = 'urgent'));
    end loop;
    update public.announcements set notified_at = now() where id = a.id;
  end loop;

  -- Mentoring in the next 24h
  for r in select * from public.mentoring_sessions
           where status = 'scheduled' and reminder_sent_at is null
             and scheduled_at between now() and now() + interval '24 hours' for update skip locked
  loop
    perform public.notify(r.student_id, 'mentoring_soon', 'Sua mentoria é em breve',
                          to_char(r.scheduled_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI'),
                          '/mentorias/' || r.id, jsonb_build_object('session_id', r.id));
    perform public.notify(r.mentor_id, 'mentoring_soon', 'Mentoria em breve',
                          to_char(r.scheduled_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI'),
                          '/mentorias/' || r.id, jsonb_build_object('session_id', r.id));
    update public.mentoring_sessions set reminder_sent_at = now() where id = r.id;
  end loop;

  -- Deadlines in the next 48h for students who haven't submitted
  for r in select a.id, a.title, a.due_at, e.user_id
           from public.assignments a
           join public.subject_cohorts sc on sc.subject_id = a.subject_id and (a.cohort_id is null or sc.cohort_id = a.cohort_id)
           join public.enrollments e on e.cohort_id = sc.cohort_id and e.status = 'active'
           where a.status = 'published' and a.due_at between now() and now() + interval '48 hours'
             and not exists (select 1 from public.assignment_submissions s where s.assignment_id = a.id
                             and s.student_id = e.user_id and s.status <> 'draft')
             and not exists (select 1 from public.notifications n where n.user_id = e.user_id
                             and n.type = 'deadline_soon' and n.data ->> 'assignment_id' = a.id::text)
  loop
    perform public.notify(r.user_id, 'deadline_soon', 'Prazo chegando: ' || r.title,
                          to_char(r.due_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'),
                          '/entregas/' || r.id, jsonb_build_object('assignment_id', r.id));
  end loop;
end $$;
revoke execute on function public.run_notification_jobs() from public, anon, authenticated;

-- Schedule every 10 min when pg_cron is available (enabled by default on Supabase).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('neolevel-notification-jobs', '*/10 * * * *', 'select public.run_notification_jobs()');
  end if;
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;

-- ------------------------------------------------------- Activity timeline ----
-- Feeds the Perfil 360º timeline and "sem atualização" alerts.
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,  -- the Neoleader
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  title text not null,
  dimension public.progress_dimension,
  ref_table text,
  ref_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index activity_events_user_idx on public.activity_events (user_id, occurred_at desc);

alter table public.activity_events enable row level security;
create policy activity_events_select on public.activity_events for select to authenticated
  using (public.can_view_student(user_id));

create or replace function public.log_activity(
  p_user uuid, p_type text, p_title text, p_dimension public.progress_dimension,
  p_ref_table text, p_ref_id uuid, p_metadata jsonb default '{}'
) returns void language sql security definer set search_path = '' as $$
  insert into public.activity_events (user_id, actor_id, type, title, dimension, ref_table, ref_id, metadata)
  values (p_user, auth.uid(), p_type, p_title, p_dimension, p_ref_table, p_ref_id, coalesce(p_metadata, '{}'))
$$;
revoke execute on function public.log_activity(uuid, text, text, public.progress_dimension, text, uuid, jsonb)
  from public, anon, authenticated;

create or replace function public.activity_from_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  if new.status in ('present', 'late') and (tg_op = 'INSERT' or old.status not in ('present', 'late')) then
    select 'Aula de ' || s.name || ': ' || l.title into v_title
    from public.lessons l join public.subjects s on s.id = l.subject_id where l.id = new.lesson_id;
    perform public.log_activity(new.student_id, 'lesson_attended', v_title, 'learning', 'lessons', new.lesson_id);
  end if;
  return new;
end $$;
create trigger attendance_activity after insert or update of status on public.attendance
  for each row execute function public.activity_from_attendance();

create or replace function public.activity_from_mentoring()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform public.log_activity(new.student_id, 'mentoring_completed',
      'Mentoria com ' || (select full_name from public.profiles where id = new.mentor_id),
      'mentoring', 'mentoring_sessions', new.id);
  end if;
  return new;
end $$;
create trigger mentoring_activity after update of status on public.mentoring_sessions
  for each row execute function public.activity_from_mentoring();

create or replace function public.activity_from_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('submitted', 'late') and (tg_op = 'INSERT' or old.status in ('draft', 'returned')) then
    perform public.log_activity(new.student_id, 'assignment_submitted',
      'Entrega concluída: ' || (select title from public.assignments where id = new.assignment_id),
      'execution', 'assignment_submissions', new.id);
  end if;
  return new;
end $$;
create trigger submission_activity after insert or update of status on public.assignment_submissions
  for each row execute function public.activity_from_submission();

create or replace function public.activity_from_registration()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'attended' and (tg_op = 'INSERT' or old.status <> 'attended') then
    perform public.log_activity(new.user_id, 'experience_attended',
      'Participou de ' || (select title from public.experiences where id = new.experience_id),
      'experiences', 'experiences', new.experience_id);
  end if;
  return new;
end $$;
create trigger registration_activity after insert or update of status on public.experience_registrations
  for each row execute function public.activity_from_registration();

create or replace function public.activity_from_venture_stage()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_name text;
begin
  select owner_id, name into v_owner, v_name from public.ventures where id = new.venture_id;
  perform public.log_activity(v_owner, 'venture_stage',
    v_name || ' avançou para ' || case new.to_stage
      when 'ideation' then 'Ideação' when 'validation' then 'Validação' when 'mvp' then 'MVP'
      when 'operation' then 'Operação' when 'traction' then 'Tração' when 'scale' then 'Escala' end,
    'venture', 'ventures', new.venture_id, jsonb_build_object('from', new.from_stage, 'to', new.to_stage));
  return new;
end $$;
create trigger venture_stage_activity after insert on public.venture_stage_history
  for each row execute function public.activity_from_venture_stage();

create or replace function public.activity_from_milestone()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'achieved' and (tg_op = 'INSERT' or old.status <> 'achieved') then
    perform public.log_activity((select owner_id from public.ventures where id = new.venture_id),
      'milestone_achieved', 'Milestone: ' || new.title, 'venture', 'venture_milestones', new.id);
  end if;
  return new;
end $$;
create trigger milestone_activity after insert or update of status on public.venture_milestones
  for each row execute function public.activity_from_milestone();

create or replace function public.activity_from_goal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    perform public.log_activity(new.owner_id, 'goal_completed', 'Meta concluída: ' || new.title,
                                'goals', 'goals', new.id);
  end if;
  return new;
end $$;
create trigger goal_activity after insert or update of status on public.goals
  for each row execute function public.activity_from_goal();

-- ------------------------------------------------------------- Neo Progress ---
-- Weights and labels are configurable by the school.
create table public.progress_dimension_settings (
  dimension public.progress_dimension primary key,
  label text not null,
  description text,
  weight numeric(5,2) not null default 1 check (weight >= 0),
  is_enabled boolean not null default true,
  sort_order int not null default 0,
  config jsonb not null default '{}'::jsonb      -- e.g. {"target_sessions_90d": 3}
);
alter table public.progress_dimension_settings enable row level security;
create policy progress_settings_select on public.progress_dimension_settings for select to authenticated using (true);
create policy progress_settings_write on public.progress_dimension_settings for all to authenticated
  using ((select public.has_permission('settings.manage'))) with check ((select public.has_permission('settings.manage')));

-- Each dimension 0–100 (null = not enough data yet). Not a simple % of classes.
create or replace function public.neo_progress(p_student uuid default auth.uid())
returns table (dimension public.progress_dimension, label text, score numeric, weight numeric, details jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_att_total int; v_att_ok int;
  v_asg_total int; v_asg_done int;
  v_act_total int; v_act_done int;
  v_step_total int; v_step_done int;
  v_ment int; v_ment_target int;
  v_exp_eligible int; v_exp_attended int; v_reflections int;
  v_stage int; v_ms_total int; v_ms_done int; v_cp_total int; v_cp_done int;
  v_goal_avg numeric; v_goal_count int;
  v_track public.neoleader_track;
  s record;
  v_score numeric; v_details jsonb;
begin
  if not public.can_view_student(p_student) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select np.track into v_track from public.neoleader_profiles np where np.user_id = p_student;

  -- Aprendizado: attendance + on-time submissions
  select count(*), count(*) filter (where a.status in ('present', 'late'))
    into v_att_total, v_att_ok
  from public.lessons l
  join public.enrollments e on e.cohort_id = l.cohort_id and e.user_id = p_student
  left join public.attendance a on a.lesson_id = l.id and a.student_id = p_student
  where l.starts_at < now() and l.status <> 'canceled' and l.starts_at >= e.enrolled_at - interval '30 days';

  select count(*), count(*) filter (where sub.status in ('submitted', 'late', 'reviewed'))
    into v_asg_total, v_asg_done
  from public.assignments asg
  join public.subject_cohorts sc on sc.subject_id = asg.subject_id and (asg.cohort_id is null or asg.cohort_id = sc.cohort_id)
  join public.enrollments e on e.cohort_id = sc.cohort_id and e.user_id = p_student
  left join public.assignment_submissions sub on sub.assignment_id = asg.id and sub.student_id = p_student
  where asg.status in ('published', 'closed') and asg.due_at < now();

  -- Execução: venture plan actions + mentoring next steps
  select count(*) , count(*) filter (where va.status = 'done') into v_act_total, v_act_done
  from public.venture_actions va join public.ventures v on v.id = va.venture_id
  where public.is_venture_member(v.id, p_student);
  select count(*) filter (where status <> 'canceled'), count(*) filter (where status = 'done')
    into v_step_total, v_step_done
  from public.mentoring_action_items where student_id = p_student;

  -- Mentorias: completed sessions in the last 90 days vs target
  select count(*) into v_ment from public.mentoring_sessions
  where student_id = p_student and status = 'completed' and completed_at >= now() - interval '90 days';
  select coalesce((config ->> 'target_sessions_90d')::int, 3) into v_ment_target
  from public.progress_dimension_settings where progress_dimension_settings.dimension = 'mentoring';
  v_ment_target := coalesce(v_ment_target, 3);

  -- Participação & Experiências
  select count(*) into v_exp_eligible from public.experiences x
  where x.status in ('published', 'completed') and x.starts_at < now() and x.starts_at >= now() - interval '180 days'
    and (x.cohort_id is null or public.is_cohort_member(x.cohort_id, p_student));
  select count(*) into v_exp_attended from public.experience_registrations r
  join public.experiences x on x.id = r.experience_id
  where r.user_id = p_student and x.starts_at < now() and x.starts_at >= now() - interval '180 days'
    and (r.status = 'attended' or r.checked_in_at is not null);
  select count(*) into v_reflections from public.experience_reflections rf
  where rf.user_id = p_student and coalesce(rf.main_learning, '') <> '';

  -- Projeto empresarial: stage + milestones + track checkpoints
  select case v.stage when 'ideation' then 0 when 'validation' then 1 when 'mvp' then 2
                      when 'operation' then 3 when 'traction' then 4 when 'scale' then 5 end,
         (select count(*) from public.venture_milestones m where m.venture_id = v.id),
         (select count(*) from public.venture_milestones m where m.venture_id = v.id and m.status = 'achieved')
    into v_stage, v_ms_total, v_ms_done
  from public.ventures v where v.owner_id = p_student and v.is_primary;
  select count(*), count(*) filter (where nc.status = 'done') into v_cp_total, v_cp_done
  from public.track_checkpoints tc
  left join public.neoleader_checkpoints nc on nc.checkpoint_id = tc.id and nc.user_id = p_student
  where tc.is_active and tc.track = coalesce(v_track, 'founder');

  -- Metas
  select avg(case when g.status = 'done' then 100 else g.progress end), count(*)
    into v_goal_avg, v_goal_count
  from public.goals g where g.owner_id = p_student and g.status <> 'canceled';

  for s in select * from public.progress_dimension_settings where is_enabled order by sort_order loop
    v_score := null; v_details := '{}';
    case s.dimension
      when 'learning' then
        v_score := case
          when v_att_total > 0 and v_asg_total > 0 then 0.6 * (100.0 * v_att_ok / v_att_total) + 0.4 * (100.0 * v_asg_done / v_asg_total)
          when v_att_total > 0 then 100.0 * v_att_ok / v_att_total
          when v_asg_total > 0 then 100.0 * v_asg_done / v_asg_total end;
        v_details := jsonb_build_object('lessons', v_att_total, 'attended', v_att_ok, 'assignments', v_asg_total, 'submitted', v_asg_done);
      when 'execution' then
        v_score := case when v_act_total + v_step_total > 0 then 100.0 * (v_act_done + v_step_done) / (v_act_total + v_step_total) end;
        v_details := jsonb_build_object('actions', v_act_total, 'actions_done', v_act_done, 'next_steps', v_step_total, 'next_steps_done', v_step_done);
      when 'mentoring' then
        v_score := least(100, 100.0 * v_ment / greatest(v_ment_target, 1));
        v_details := jsonb_build_object('sessions_90d', v_ment, 'target', v_ment_target);
      when 'participation' then
        v_score := case when v_exp_eligible > 0 then least(100, 100.0 * v_exp_attended / v_exp_eligible) end;
        v_details := jsonb_build_object('eligible', v_exp_eligible, 'attended', v_exp_attended);
      when 'venture' then
        v_score := (
          select avg(x) from unnest(array[
            case when v_stage is not null then 100.0 * v_stage / 5 end,
            case when v_ms_total > 0 then 100.0 * v_ms_done / v_ms_total end,
            case when v_cp_total > 0 then 100.0 * v_cp_done / v_cp_total end
          ]) as x);
        v_details := jsonb_build_object('stage_index', v_stage, 'milestones', v_ms_total, 'milestones_done', v_ms_done,
                                        'checkpoints', v_cp_total, 'checkpoints_done', v_cp_done, 'track', v_track);
      when 'experiences' then
        v_score := case when v_exp_attended > 0 then least(100, 100.0 * v_reflections / v_exp_attended) end;
        v_details := jsonb_build_object('attended', v_exp_attended, 'reflections', v_reflections);
      when 'goals' then
        v_score := v_goal_avg;
        v_details := jsonb_build_object('goals', v_goal_count);
    end case;
    dimension := s.dimension; label := s.label; weight := s.weight;
    score := round(v_score, 1); details := v_details;
    return next;
  end loop;
end $$;

-- ---------------------------------------------------------------- Journey -----
create type public.journey_item_kind as enum
  ('subject', 'mentoring', 'project', 'event', 'company_visit', 'milestone', 'panel', 'experience', 'certification');

-- Program timeline (2 years) — per cohort, or global when cohort_id is null.
create table public.journey_milestones (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts (id) on delete cascade,
  kind public.journey_item_kind not null,
  title text not null,
  description text,
  planned_start date,
  planned_end date,
  subject_id uuid references public.subjects (id) on delete set null,
  experience_id uuid references public.experiences (id) on delete set null,
  panel_round_id uuid references public.panel_rounds (id) on delete set null,
  -- what "completing" this step requires, shown in "Seu próximo nível"
  requirements jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index journey_milestones_cohort_idx on public.journey_milestones (cohort_id, sort_order);

create table public.journey_completions (
  milestone_id uuid not null references public.journey_milestones (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  primary key (milestone_id, user_id)
);

alter table public.journey_milestones enable row level security;
alter table public.journey_completions enable row level security;
create policy journey_milestones_select on public.journey_milestones for select to authenticated
  using (cohort_id is null or public.is_cohort_member(cohort_id) or (select public.has_permission('classes.view')));
create policy journey_milestones_write on public.journey_milestones for all to authenticated
  using ((select public.has_permission('classes.edit'))) with check ((select public.has_permission('classes.edit')));
create policy journey_completions_select on public.journey_completions for select to authenticated
  using (public.can_view_student(user_id));
create policy journey_completions_write on public.journey_completions for all to authenticated
  using ((select public.has_permission('students.edit'))) with check ((select public.has_permission('students.edit')));

-- ----------------------------------------------------- Current user context ---
-- One call after login: who am I, what can I do, where do I land.
create or replace function public.current_user_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (select * from public.profiles where id = auth.uid()),
  my_roles as (
    select r.key, r.name, r.dashboard, r.priority from public.user_roles ur
    join public.roles r on r.id = ur.role_id where ur.user_id = auth.uid()
  ),
  primary_role as (select * from my_roles order by priority limit 1),
  cohort as (
    select c.id, c.name from public.enrollments e join public.cohorts c on c.id = e.cohort_id
    where e.user_id = auth.uid() and e.status = 'active' order by e.enrolled_at desc limit 1
  )
  select case when not exists (select 1 from me) then null else jsonb_build_object(
    'user_id', (select id from me),
    'full_name', (select full_name from me),
    'preferred_name', (select preferred_name from me),
    'avatar_url', (select avatar_url from me),
    'job_title', (select job_title from me),
    'status', (select status from me),
    'must_change_password', (select must_change_password from me),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'name', name) order by priority) from my_roles), '[]'),
    'primary_role', (select key from primary_role),
    'dashboard', coalesce((select dashboard from primary_role), 'neoleader'),
    'permissions', coalesce((select jsonb_agg(p) from public.my_permissions() p), '[]'),
    'cohort', (select jsonb_build_object('id', id, 'name', name) from cohort),
    'track', (select track from public.neoleader_profiles where user_id = auth.uid())
  ) end
$$;

-- First access: mark active + onboarded, and clear the forced password change flag
-- (call right after supabase.auth.updateUser({ password })).
create or replace function public.complete_first_access()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('neolevel.trusted_update', 'on', true);
  update public.profiles
     set status = case when status = 'invited' then 'active'::public.user_status else status end,
         must_change_password = false,
         onboarded_at = coalesce(onboarded_at, now())
   where id = auth.uid();
  perform set_config('neolevel.trusted_update', 'off', true);
end $$;

create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set last_seen_at = now() where id = auth.uid()
$$;
