-- =============================================================================
-- RLS / authorization test suite. Run with supabase/tests/run_tests.sh
-- Each check raises an exception on failure; the whole file runs in one transaction.
-- =============================================================================
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------------------------------------------------------------- fixtures ----
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@neo.test', '{"full_name":"Ana Admin"}', '{"role_key":"super_admin"}'),
  ('00000000-0000-0000-0000-00000000000c', 'coord@neo.test', '{"full_name":"Caio Coordenador"}', '{"role_key":"coordinator"}'),
  ('00000000-0000-0000-0000-00000000000d', 'teacher@neo.test', '{"full_name":"Luiz Professor"}', '{"role_key":"teacher"}'),
  ('00000000-0000-0000-0000-00000000000e', 'mentor@neo.test', '{"full_name":"Marta Mentora"}', '{"role_key":"mentor"}'),
  ('00000000-0000-0000-0000-000000000001', 'alice@neo.test', '{"full_name":"Alice Neoleader"}', '{"role_key":"neoleader"}'),
  ('00000000-0000-0000-0000-000000000002', 'bob@neo.test', '{"full_name":"Bob Neoleader"}', '{"role_key":"neoleader"}'),
  ('00000000-0000-0000-0000-000000000003', 'carol@neo.test', '{"full_name":"Carol Neoleader"}', '{"role_key":"neoleader"}'),
  ('00000000-0000-0000-0000-000000000009', 'new@neo.test', '{"full_name":"Novo Convidado"}', '{"role_key":"neoleader"}');
update public.profiles set status = 'active' where id <> '00000000-0000-0000-0000-000000000009';

insert into public.cohorts (id, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'NeoLevel 2026.1', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'NeoLevel 2026.2', 'active');
insert into public.enrollments (user_id, cohort_id) values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000b');
insert into public.neoleader_profiles (user_id, track) values
  ('00000000-0000-0000-0000-000000000001', 'founder'),
  ('00000000-0000-0000-0000-000000000002', 'successor'),
  ('00000000-0000-0000-0000-000000000003', 'founder');

-- teacher teaches EST only to cohort A
insert into public.subject_teachers (subject_id, user_id) select id, '00000000-0000-0000-0000-00000000000d' from public.subjects where code = 'EST';
insert into public.subject_cohorts (subject_id, cohort_id) select id, '10000000-0000-0000-0000-00000000000a' from public.subjects where code = 'EST';
insert into public.lessons (id, subject_id, cohort_id, title, starts_at, ends_at, teacher_id, room, location, checkin_open)
select '20000000-0000-0000-0000-000000000001', id, '10000000-0000-0000-0000-00000000000a', 'Estratégia Empresarial',
       now() - interval '10 minutes', now() + interval '2 hours', '00000000-0000-0000-0000-00000000000d', 'Sala 02', 'Academia FIESC', true
from public.subjects where code = 'EST';
insert into public.assignments (id, subject_id, title, status, due_at)
select '21000000-0000-0000-0000-000000000001', id, 'Análise SWOT', 'published', now() + interval '7 days' from public.subjects where code = 'EST';

-- mentor ↔ alice
insert into public.mentor_assignments (mentor_id, student_id) values
  ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000001');
insert into public.mentoring_sessions (id, mentor_id, student_id, scheduled_at) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000001', now() + interval '1 day');
insert into public.mentoring_private_notes (student_id, session_id, author_id, content) values
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'Nota privada: insegurança com pricing');

insert into public.ventures (id, owner_id, name, segment, stage, visibility) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'AgroData', 'AgTech', 'validation', 'private'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'EduPlay', 'EdTech', 'mvp', 'community');
insert into public.family_businesses (owner_id, company_name, sector) values
  ('00000000-0000-0000-0000-000000000002', 'Metalúrgica Família B', 'Indústria');

create or replace function pg_temp.act_as(p_user text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function pg_temp.check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'ok  %', p_label;
end $$;
set client_min_messages = notice;

-- ----------------------------------------------------------------- RBAC -------
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check(public.has_permission('documents.view'), 'neoleader has documents.view');
select pg_temp.check(not public.has_permission('users.view'), 'neoleader lacks users.view');
select pg_temp.check((public.current_user_context() ->> 'dashboard') = 'neoleader', 'alice lands on neoleader dashboard');
select pg_temp.check((public.current_user_context() -> 'cohort' ->> 'name') = 'NeoLevel 2026.1', 'context includes cohort');
do $$ begin
  begin
    insert into public.user_roles (user_id, role_id) select '00000000-0000-0000-0000-000000000001', id from public.roles where key = 'coordinator';
    raise exception 'FAIL: neoleader granted self a role';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set status = 'alumni' where id = '00000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: neoleader changed own status';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'neoleader cannot self-assign roles or change status');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((public.current_user_context() ->> 'dashboard') = 'mentor', 'mentor lands on mentor dashboard');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
do $$ begin
  begin
    insert into public.user_roles (user_id, role_id) select '00000000-0000-0000-0000-000000000003', id from public.roles where key = 'super_admin';
    raise exception 'FAIL: coordinator granted super_admin';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'coordinator cannot grant super_admin');
do $$ begin
  begin
    insert into public.user_permissions (user_id, permission_key, effect) values ('00000000-0000-0000-0000-000000000003', 'community.view', 'revoke');
    raise exception 'FAIL: coordinator managed individual permissions';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'only permissions.manage edits individual permissions');
select pg_temp.check((select count(*) from public.profile_private where user_id = '00000000-0000-0000-0000-000000000001') = 1, 'coordinator reads contact data');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.user_permissions (user_id, permission_key, effect) values ('00000000-0000-0000-0000-000000000003', 'community.view', 'revoke');
select pg_temp.check(not public.has_permission('community.view', '00000000-0000-0000-0000-000000000003'), 'individual revoke overrides role');
insert into public.user_permissions (user_id, permission_key, effect) values ('00000000-0000-0000-0000-000000000003', 'events.manage', 'grant');
select pg_temp.check(public.has_permission('events.manage', '00000000-0000-0000-0000-000000000003'), 'individual grant adds permission');
delete from public.user_permissions where user_id = '00000000-0000-0000-0000-000000000003';
reset role;

-- --------------------------------------------------------- Contact privacy -----
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select pg_temp.check((select count(*) from public.profile_private where user_id = '00000000-0000-0000-0000-000000000001') = 0, 'peer cannot read e-mail/phone');
select pg_temp.check((select count(*) from public.profiles) >= 7, 'profile cards visible to members');
reset role;

-- ------------------------------------------------------- Mentoring privacy ----
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from public.mentoring_private_notes) = 0, 'NEOLEADER NEVER SEES PRIVATE MENTOR NOTES');
select pg_temp.check((select count(*) from public.mentoring_sessions) = 1, 'neoleader sees own session');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from public.mentoring_private_notes) = 1, 'mentor sees own private notes');
select public.complete_mentoring_session('30000000-0000-0000-0000-000000000001', 'Boa sessão',
  null, 'Focar em B2B', array['Entrevistar 10 clientes', 'Revisar pricing', 'Atualizar projeção financeira'], 14, 'Outra nota privada');
select pg_temp.check((select count(*) from public.mentoring_action_items where student_id = '00000000-0000-0000-0000-000000000001') = 3, 'completing session creates next steps');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from public.mentoring_private_notes) = 0, 'still no private notes after completion');
select pg_temp.check((select count(*) from public.mentoring_action_items) = 3, 'neoleader sees own next steps');
select pg_temp.check((select count(*) from public.activity_events where type = 'mentoring_completed') = 1, 'timeline logs mentoring');
reset role;

-- ------------------------------------------------------------ Scoping ---------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check(public.can_view_student('00000000-0000-0000-0000-000000000001'), 'teacher sees student of own subject');
select pg_temp.check(not public.can_view_student('00000000-0000-0000-0000-000000000002'), 'teacher cannot see student outside subjects');
select pg_temp.check((select count(*) from public.family_businesses) = 0, 'teacher cannot see family business data');
insert into public.attendance (lesson_id, student_id, status) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'present');
select pg_temp.check(true, 'teacher records attendance');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from public.ventures) = 1, 'mentor sees only mentee venture');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select pg_temp.check((select count(*) from public.ventures) = 1, 'neoleader sees only own venture');
select pg_temp.check((select count(*) from public.goals where owner_id = '00000000-0000-0000-0000-000000000001') = 0, 'peer cannot see goals');
select pg_temp.check((select count(*) from public.family_businesses) = 0, 'peer cannot see family business');
select pg_temp.check((select venture_name from public.community_directory() where user_id = '00000000-0000-0000-0000-000000000003') = 'EduPlay', 'directory shows community venture');
select pg_temp.check((select venture_name from public.community_directory() where user_id = '00000000-0000-0000-0000-000000000001') is null, 'directory hides private venture');
do $$ begin
  begin
    perform * from public.neo_progress('00000000-0000-0000-0000-000000000001');
    raise exception 'FAIL: peer computed someone else''s progress';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'peer cannot read Neo Progress of others');
reset role;

-- ---------------------------------------------------- Academic integrity -----
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select (public.self_check_in('20000000-0000-0000-0000-000000000001')).status;
select pg_temp.check((select status from public.attendance where student_id = '00000000-0000-0000-0000-000000000001') = 'present', 'self check-in works');
insert into public.assignment_submissions (assignment_id, student_id, content, status, score)
values ('21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Minha SWOT', 'submitted', 10);
select pg_temp.check((select score is null and submitted_at is not null from public.assignment_submissions) , 'student cannot self-grade');
do $$ begin
  begin
    update public.assignment_submissions set score = 10;
    raise exception 'FAIL: student graded self';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check((select count(*) from public.neo_progress()) = 7, 'neo progress returns 7 dimensions');
select pg_temp.check((select score from public.neo_progress() where dimension = 'learning') = 100, 'learning reflects attendance');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
do $$ begin
  begin
    perform public.self_check_in('20000000-0000-0000-0000-000000000001');
    raise exception 'FAIL: other cohort checked in';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'other cohort cannot check in');
select pg_temp.check((select count(*) from public.lessons) = 0, 'other cohort does not see lesson');
reset role;

-- --------------------------------------------------- Announcements -----------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into public.announcements (id, title, body, author_id, status, requires_ack)
values ('50000000-0000-0000-0000-000000000001', 'Aula extra', 'Sábado', '00000000-0000-0000-0000-00000000000c', 'published', true);
insert into public.announcement_targets (announcement_id, target_type, target_id)
values ('50000000-0000-0000-0000-000000000001', 'cohort', '10000000-0000-0000-0000-00000000000a');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from public.announcements) = 1, 'cohort member sees announcement');
insert into public.announcement_reads (announcement_id, user_id) values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select pg_temp.check((select count(*) from public.announcements) = 0, 'other cohort does not see announcement');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select sent = 2 and read = 1 and pending = 1 from public.announcement_stats('50000000-0000-0000-0000-000000000001')), 'announcement stats: sent 2 / read 1 / pending 1');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
do $$ begin
  begin
    insert into public.announcements (id, title, body, author_id, status) values
      ('50000000-0000-0000-0000-000000000002', 'Prova', 'x', '00000000-0000-0000-0000-00000000000d', 'published');
    insert into public.announcement_targets (announcement_id, target_type) values ('50000000-0000-0000-0000-000000000002', 'all');
    raise exception 'FAIL: teacher targeted everyone';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'teacher can only target own subjects');
reset role;

-- ------------------------------------------------------- Experiences ---------
insert into public.experiences (id, category, title, starts_at, capacity, status)
values ('60000000-0000-0000-0000-000000000001', 'company_visit', 'Visita WEG', now() + interval '5 days', 1, 'published');
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check((public.register_for_experience('60000000-0000-0000-0000-000000000001')).status = 'confirmed', 'first registration confirmed');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select pg_temp.check((public.register_for_experience('60000000-0000-0000-0000-000000000001')).status = 'waitlist', 'second registration goes to waitlist');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select public.cancel_experience_registration('60000000-0000-0000-0000-000000000001');
reset role;
select pg_temp.check((select status from public.experience_registrations where user_id = '00000000-0000-0000-0000-000000000003') = 'confirmed', 'waitlist promoted after cancellation');

-- ------------------------------------------------------------- Chat ----------
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select public.get_or_create_direct_conversation('00000000-0000-0000-0000-00000000000e') as conv \gset
insert into public.messages (conversation_id, sender_id, body) values (:'conv', '00000000-0000-0000-0000-000000000001', 'Oi Marta!');
select pg_temp.check(public.get_or_create_direct_conversation('00000000-0000-0000-0000-00000000000e') = :'conv', 'direct conversation is reused');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select pg_temp.check((select count(*) from public.messages) = 0, 'non-member cannot read conversation');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from public.notifications where type = 'message') = 1, 'recipient notified of new message');
reset role;

-- ------------------------------------------------------------- Bancas --------
insert into public.panel_rounds (id, name, status) values ('70000000-0000-0000-0000-000000000001', 'Banca 2026', 'open');
insert into public.panel_criteria (id, round_id, name, weight) values ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Problema', 1);
insert into public.panel_evaluators (round_id, user_id) values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e');
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
insert into public.pitch_submissions (id, round_id, venture_id, submitted_by, status, problem)
values ('72000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'submitted', 'Dados no agro');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
insert into public.pitch_evaluations (id, submission_id, evaluator_id, submitted_at) values ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', now());
insert into public.pitch_scores (evaluation_id, criterion_id, score) values ('73000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 8);
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from public.pitch_scores) = 0, 'founder never sees panel scores');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select weighted_score from public.pitch_results('70000000-0000-0000-0000-000000000001')) = 8, 'coordination sees weighted result');
reset role;

-- ------------------------------------------------------- First access --------
select pg_temp.act_as('00000000-0000-0000-0000-000000000009');
select pg_temp.check((public.current_user_context() ->> 'must_change_password')::boolean, 'invited user must change password');
select public.complete_first_access();
select pg_temp.check((select status = 'active' and not must_change_password from public.profiles where id = '00000000-0000-0000-0000-000000000009'), 'first access activates account');
reset role;

-- -------------------------------------------------------------- Storage ------
insert into public.documents (id, title, category, owner_user_id) values ('80000000-0000-0000-0000-000000000001', 'Contrato Alice', 'contract', '00000000-0000-0000-0000-000000000001');
insert into storage.objects (bucket_id, name) values ('documents', '80000000-0000-0000-0000-000000000001/1/contrato.pdf');
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'documents') = 1, 'owner reads own contract file');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'documents') = 0, 'peer cannot read contract file');
reset role;

-- ------------------------------------------------------ Agenda & journey ----
insert into public.calendar_events (id, title, event_type, starts_at, created_by)
values ('90000000-0000-0000-0000-000000000001', 'Reunião de turma', 'meeting', now() + interval '1 day', '00000000-0000-0000-0000-00000000000c');
insert into public.calendar_event_targets (event_id, target_type, target_id)
values ('90000000-0000-0000-0000-000000000001', 'cohort', '10000000-0000-0000-0000-00000000000a');
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from public.my_agenda(now() - interval '1 day', now() + interval '8 days')
                      where source = 'calendar_event') = 1, 'agenda shows targeted event (no policy recursion)');
select pg_temp.check((select count(*) from public.my_agenda(now() - interval '1 day', now() + interval '8 days')
                      where item_type = 'class') = 1, 'agenda shows cohort lesson');
select pg_temp.check((select count(*) from public.student_journey()) >= 1, 'journey timeline builds');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select pg_temp.check((select count(*) from public.calendar_events) = 0, 'other cohort does not see event');
do $$ begin
  begin
    perform * from public.student_journey('00000000-0000-0000-0000-000000000001');
    raise exception 'FAIL: peer read journey';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'peer cannot read journey of others');
reset role;

-- --------------------------------------------------- Academic insights ----
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from public.cohort_students('10000000-0000-0000-0000-00000000000a')) = 2, 'coordination sees cohort roster');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select count(*) from public.subject_results((select id from public.subjects where code = 'EST'))) = 2, 'teacher sees results of own subject');
do $$ begin
  begin
    perform * from public.cohort_students('10000000-0000-0000-0000-00000000000a');
    raise exception 'FAIL: teacher read cohort risk roster';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'teacher cannot read cohort risk roster');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
do $$ begin
  begin
    perform * from public.subject_results((select id from public.subjects where code = 'EST'));
    raise exception 'FAIL: student read subject results';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'neoleader cannot read class results');
reset role;

-- ------------------------------------------------------- Mentor insights ----
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from public.mentor_mentees()) = 1, 'mentor sees own mentee card');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
do $$ begin
  begin
    perform * from public.mentor_mentees('00000000-0000-0000-0000-00000000000e');
    raise exception 'FAIL: neoleader read mentor cards';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'neoleader cannot read another mentor dashboard');
select public.add_session_files('30000000-0000-0000-0000-000000000001', '[{"path":"x","name":"x.pdf"}]');
select pg_temp.check((select jsonb_array_length(files) from public.mentoring_sessions where id = '30000000-0000-0000-0000-000000000001') = 1, 'neoleader attaches file to own session');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
do $$ begin
  begin
    perform public.add_session_files('30000000-0000-0000-0000-000000000001', '[]');
    raise exception 'FAIL: peer attached file';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'peer cannot attach files to others sessions');
reset role;

-- ----------------------------------------------------------- Ecosystem -----
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from public.ventures where id = '40000000-0000-0000-0000-000000000001') = 1, 'panel evaluator sees pitched venture');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from public.student_achievements()) = 15, 'achievements computed (15)');
select pg_temp.check((select unlocked from public.student_achievements() where key = 'pitch_submitted'), 'pitch achievement unlocked');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
do $$ begin
  begin
    perform * from public.student_achievements('00000000-0000-0000-0000-000000000001');
    raise exception 'FAIL: peer read achievements';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'peer cannot read achievements of others');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.user_permissions (user_id, permission_key, effect) values ('00000000-0000-0000-0000-000000000003', 'community.view', 'revoke');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select pg_temp.check((select count(*) from public.community_directory()) = 0, 'revoked community.view hides directory');
reset role;

-- ----------------------------------------------------- Communication views ----
-- (everything runs in one transaction: move the mentor's read marker back in time)
update public.conversation_members set last_read_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-00000000000e';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select unread from public.my_conversations() limit 1) = 1, 'mentor sees 1 unread message');
select pg_temp.check((select title from public.my_conversations() limit 1) = 'Alice Neoleader', 'direct chat titled with the other person');
select public.mark_conversation_read((select id from public.my_conversations() limit 1));
select pg_temp.check((select unread from public.my_conversations() limit 1) = 0, 'marking read clears unread');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
do $$ begin
  begin
    perform public.create_group_conversation('Grupo', 'group', '{}');
    raise exception 'FAIL: neoleader created group';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check(true, 'neoleader cannot create groups');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select public.create_group_conversation('Turma 2026.1', 'cohort', '{}', '10000000-0000-0000-0000-00000000000a') as gid \gset
select pg_temp.check((select count(*) from public.conversation_members where conversation_id = :'gid') = 3, 'cohort room includes coordinator + 2 students');
select pg_temp.check((select count(*) from public.announcement_recipients('50000000-0000-0000-0000-000000000001') where read_at is null) = 1, 'recipient list shows who is pending');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select pg_temp.check((select count(*) from public.my_conversations()) = 0, 'other cohort not in cohort room');
reset role;

-- ------------------------------------------- INSERT ... RETURNING (creator) ----
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
with r as (insert into public.announcements (title, body, author_id, status) values ('Aviso da disciplina', 'x', '00000000-0000-0000-0000-00000000000d', 'published') returning id)
select pg_temp.check((select count(*) from r) = 1, 'teacher gets own announcement back on insert');
with r as (insert into public.documents (title, created_by) values ('Slides', '00000000-0000-0000-0000-00000000000d') returning id)
select pg_temp.check((select count(*) from r) = 1, 'teacher gets own document back on insert');
with r as (insert into public.calendar_events (title, starts_at, created_by) values ('Reunião', now(), '00000000-0000-0000-0000-00000000000d') returning id)
select pg_temp.check((select count(*) from r) = 1, 'user gets own calendar event back on insert');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
with r as (insert into public.ventures (owner_id, name) values ('00000000-0000-0000-0000-000000000002', 'Novo negócio') returning id)
select pg_temp.check((select count(*) from r) = 1, 'neoleader gets own venture back on insert');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
with r as (insert into public.experiences (category, title, starts_at, owner_id, status) values ('workshop', 'Workshop', now() + interval '3 days', '00000000-0000-0000-0000-00000000000c', 'draft') returning id)
select pg_temp.check((select count(*) from r) = 1, 'coordination gets new experience back on insert');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select pg_temp.check((select count(*) from public.ventures where name = 'Novo negócio') = 0, 'peer still cannot see that venture');
reset role;

-- ------------------------------------------------- Reach excludes the author ----
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
insert into public.announcements (id, title, body, author_id, status) values ('50000000-0000-0000-0000-0000000000a1', 'Leitura', 'x', '00000000-0000-0000-0000-00000000000d', 'published');
insert into public.announcement_targets (announcement_id, target_type, target_id) select '50000000-0000-0000-0000-0000000000a1', 'subject', id from public.subjects where code = 'EST';
select pg_temp.check((select sent from public.announcement_stats('50000000-0000-0000-0000-0000000000a1')) = 2, 'teacher announcement reaches 2 students (author not counted)');
reset role;

select 'ALL RLS TESTS PASSED' as result;
