-- =============================================================================
-- NeoLevel · DEMO DATA (optional, removable with supabase/seed/demo_remove.sql)
--
-- Creates the cohort "NeoLevel Demo 2026.1" with Neoleaders, a teacher, a Neomentor,
-- subjects, lessons, attendance, mentoring, a venture, experiences, announcements
-- and a 2-year journey — so every screen has realistic content.
--
-- Safety:
--  * Only Neoleader / teacher / mentor demo accounts can sign in (RLS-scoped).
--  * The demo coordinator ("Coordenação Demo") has NO password: it cannot sign in.
--  * Demo subjects use their own codes (DEMO-*), never the real catalog.
--  * All e-mails use @demo.neolevel.local (no e-mail is ever sent).
-- Dates are relative to the moment the seed runs (America/Sao_Paulo).
-- Password for demo logins is passed in as :demo_password / replaced at apply time.
-- =============================================================================

-- ---------------------------------------------------------------- helpers ----
create or replace function pg_temp.at_local(p_days int, p_time time)
returns timestamptz language sql immutable as $$
  select ((current_date + p_days) + p_time) at time zone 'America/Sao_Paulo'
$$;

create or replace function pg_temp.demo_user(
  p_id uuid, p_email text, p_name text, p_role text, p_password text, p_job text default null
) returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    case when p_password is null then null else extensions.crypt(p_password, extensions.gen_salt('bf')) end,
    now(), '', '', '', '', '', '', '', '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'),
                       'role_key', p_role, 'must_change_password', false),
    jsonb_build_object('full_name', p_name), now(), now());
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (p_id::text, p_id, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), 'email', now(), now());
  update public.profiles set status = 'active', must_change_password = false, onboarded_at = now(), job_title = p_job
   where id = p_id;
end $$;

-- ------------------------------------------------------------------ people ---
select pg_temp.demo_user('d0000000-0000-4000-8000-000000000001', 'marina.costa@demo.neolevel.local', 'Marina Costa', 'neoleader', '__DEMO_PASSWORD__', 'Fundadora · Agrovia');
select pg_temp.demo_user('d0000000-0000-4000-8000-000000000002', 'pedro.almeida@demo.neolevel.local', 'Pedro Almeida', 'neoleader', '__DEMO_PASSWORD__', 'Sucessor · Grupo Almeida Têxtil');
select pg_temp.demo_user('d0000000-0000-4000-8000-000000000003', 'julia.ramos@demo.neolevel.local', 'Julia Ramos', 'neoleader', '__DEMO_PASSWORD__', 'Fundadora · Lume Saúde');
select pg_temp.demo_user('d0000000-0000-4000-8000-000000000004', 'rafael.souza@demo.neolevel.local', 'Rafael Souza', 'neoleader', '__DEMO_PASSWORD__', 'Fundador');
select pg_temp.demo_user('d0000000-0000-4000-8000-00000000000a', 'henrique.duarte@demo.neolevel.local', 'Henrique Duarte', 'teacher', '__DEMO_PASSWORD__', 'Professor de Estratégia');
select pg_temp.demo_user('d0000000-0000-4000-8000-00000000000b', 'carla.menezes@demo.neolevel.local', 'Carla Menezes', 'mentor', '__DEMO_PASSWORD__', 'CEO · Menezes Ventures');
select pg_temp.demo_user('d0000000-0000-4000-8000-00000000000c', 'coordenacao@demo.neolevel.local', 'Coordenação Demo', 'coordinator', null, 'Coordenação NeoLevel');

update public.profile_details set city = 'Florianópolis', interests = '{AgroTech,Marketplaces,Impacto}',
  competencies = '{Vendas,Produto}', sectors = '{Agronegócio,Food service}',
  bio = 'Construindo a ponte entre pequenos produtores rurais e restaurantes da Grande Florianópolis.',
  linkedin_url = 'https://www.linkedin.com/in/demo-marina', privacy = privacy || '{"venture": true}'
 where user_id = 'd0000000-0000-4000-8000-000000000001';
update public.profile_details set city = 'Blumenau', interests = '{Governança,Indústria,M&A}', sectors = '{Têxtil}',
  bio = 'Terceira geração da família, preparando a sucessão do Grupo Almeida Têxtil.'
 where user_id = 'd0000000-0000-4000-8000-000000000002';
update public.profile_details set city = 'Florianópolis', interests = '{HealthTech,IA}', sectors = '{Saúde}'
 where user_id = 'd0000000-0000-4000-8000-000000000003';
update public.profile_details set city = 'Joinville', interests = '{Fintech,Investimentos}', sectors = '{Finanças}'
 where user_id = 'd0000000-0000-4000-8000-000000000004';

insert into public.professional_profiles (user_id, headline, company, position, specialties, areas, bio, links) values
  ('d0000000-0000-4000-8000-00000000000a', 'Estrategista e professor convidado', 'Duarte Consultoria', 'Sócio-diretor',
   '{Estratégia,Planejamento,Liderança}', '{Indústria,Serviços}',
   '20 anos conduzindo planejamento estratégico em empresas catarinenses.', '[{"label":"LinkedIn","url":"https://www.linkedin.com/in/demo-henrique"}]'),
  ('d0000000-0000-4000-8000-00000000000b', 'Empreendedora serial e investidora-anjo', 'Menezes Ventures', 'CEO',
   '{Go-to-market,Vendas B2B,Captação}', '{AgroTech,SaaS,Marketplaces}',
   'Fundou e vendeu duas startups; hoje investe e mentora fundadores em estágio inicial.', '[{"label":"LinkedIn","url":"https://www.linkedin.com/in/demo-carla"}]');

-- ------------------------------------------------------------------ cohort ---
insert into public.cohorts (id, name, code, year, starts_on, ends_on, capacity, status, coordinator_id, description)
values ('d1000000-0000-4000-8000-000000000001', 'NeoLevel Demo 2026.1', 'DEMO', 2026, current_date - 90, current_date + 640, 20,
        'active', 'd0000000-0000-4000-8000-00000000000c', 'Turma de demonstração (removível).');

insert into public.enrollments (user_id, cohort_id, enrolled_at)
select u, 'd1000000-0000-4000-8000-000000000001', now() - interval '90 days'
from unnest(array['d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
                  'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004']::uuid[]) u;

insert into public.neoleader_profiles (user_id, track, headline, goals) values
  ('d0000000-0000-4000-8000-000000000001', 'founder', 'Fundadora da Agrovia', 'Chegar a R$ 10 mil de receita mensal até o fim do ano.'),
  ('d0000000-0000-4000-8000-000000000002', 'successor', 'Sucessor no Grupo Almeida Têxtil', 'Assumir a diretoria comercial em 2 anos.'),
  ('d0000000-0000-4000-8000-000000000003', 'founder', 'Fundadora da Lume Saúde', 'Validar o MVP com 3 clínicas.'),
  ('d0000000-0000-4000-8000-000000000004', 'founder', 'Explorando ideias em fintech', 'Definir o problema a resolver.');

insert into public.family_businesses (owner_id, company_name, sector, structure, employees_range, generation,
  current_position, future_position, governance_notes, succession_notes)
values ('d0000000-0000-4000-8000-000000000002', 'Grupo Almeida Têxtil', 'Têxtil', 'Holding familiar com 3 empresas operacionais',
        '200–500', '3ª geração', 'Analista comercial', 'Diretor comercial',
        'Conselho de família informal; sem conselho consultivo.', 'Pai pretende se afastar da operação em 4 anos.');

-- Track checkpoints
insert into public.neoleader_checkpoints (user_id, checkpoint_id, status, completed_at)
select 'd0000000-0000-4000-8000-000000000001', tc.id,
       case when tc.key in ('idea', 'problem', 'solution', 'validation') then 'done'
            when tc.key in ('business_model', 'mvp') then 'in_progress' else 'not_started' end::public.checkpoint_status,
       case when tc.key in ('idea', 'problem', 'solution', 'validation') then now() - (tc.sort_order * interval '9 days') end
from public.track_checkpoints tc where tc.track = 'founder';
insert into public.neoleader_checkpoints (user_id, checkpoint_id, status)
select 'd0000000-0000-4000-8000-000000000002', tc.id,
       case when tc.key in ('family_business', 'sector', 'structure') then 'done'
            when tc.key in ('current_role', 'governance') then 'in_progress' else 'not_started' end::public.checkpoint_status
from public.track_checkpoints tc where tc.track = 'successor';
insert into public.neoleader_checkpoints (user_id, checkpoint_id, status)
select 'd0000000-0000-4000-8000-000000000003', tc.id,
       case when tc.key in ('idea', 'problem') then 'done' when tc.key = 'solution' then 'in_progress' else 'not_started' end::public.checkpoint_status
from public.track_checkpoints tc where tc.track = 'founder';

-- ---------------------------------------------------------------- academic ---
insert into public.subjects (id, code, name, description, status, starts_on, ends_on, workload_hours, period_label, dimensions, sort_order, created_by) values
  ('d2000000-0000-4000-8000-000000000001', 'DEMO-LID', 'Liderança e Soft Skills', 'Autoconhecimento, comunicação e liderança de equipes.', 'completed', current_date - 90, current_date - 31, 24, '2026 · Ciclo 1', '{learning}', 1, 'd0000000-0000-4000-8000-00000000000c'),
  ('d2000000-0000-4000-8000-000000000002', 'DEMO-EST', 'Estratégia Empresarial', 'Análise competitiva, modelo de negócio e planejamento estratégico.', 'active', current_date - 30, current_date + 30, 32, '2026 · Ciclo 2', '{learning,venture}', 2, 'd0000000-0000-4000-8000-00000000000c'),
  ('d2000000-0000-4000-8000-000000000003', 'DEMO-FIN', 'Finanças e Investimentos', 'Finanças empresariais, valuation e captação.', 'active', current_date - 14, current_date + 60, 32, '2026 · Ciclo 2', '{learning,venture}', 3, 'd0000000-0000-4000-8000-00000000000c'),
  ('d2000000-0000-4000-8000-000000000004', 'DEMO-PRJ', 'Desenvolvimento de Projeto Próprio', 'Construção do negócio ao longo da jornada.', 'active', current_date - 90, current_date + 600, 120, 'Jornada completa', '{venture,execution}', 4, 'd0000000-0000-4000-8000-00000000000c');

insert into public.subject_cohorts (subject_id, cohort_id)
select s, 'd1000000-0000-4000-8000-000000000001' from unnest(array[
  'd2000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002',
  'd2000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000004']::uuid[]) s;
insert into public.subject_teachers (subject_id, user_id, role) values
  ('d2000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000a', 'lead'),
  ('d2000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-00000000000a', 'lead');
insert into public.subject_competencies (subject_id, competency_id)
select s.id, c.id from public.subjects s, public.competencies c
where (s.code, c.name) in (('DEMO-LID', 'Liderança'), ('DEMO-LID', 'Comunicação'), ('DEMO-EST', 'Visão estratégica'),
                           ('DEMO-EST', 'Tomada de decisão'), ('DEMO-FIN', 'Gestão financeira'), ('DEMO-PRJ', 'Inovação'));

-- Lessons: Liderança (past), Estratégia (weekly incl. today 19:00), Finanças (weekly)
insert into public.lessons (subject_id, cohort_id, title, description, starts_at, ends_at, lesson_type, modality, location, room, teacher_id, status, checkin_open)
select 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
       (array['Autoconhecimento e propósito', 'Comunicação de alto impacto', 'Liderando equipes jovens', 'Feedback e cultura'])[n],
       null, pg_temp.at_local(-88 + n * 14, '19:00'), pg_temp.at_local(-88 + n * 14, '22:00'),
       'class', 'in_person', 'Academia FIESC', 'Sala 02', 'd0000000-0000-4000-8000-00000000000a', 'completed', false
from generate_series(1, 4) n;

insert into public.lessons (id, subject_id, cohort_id, title, description, starts_at, ends_at, lesson_type, modality, location, room, teacher_id, status, checkin_open)
select ('d3000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       'd2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001',
       (array['Fundamentos de estratégia', 'Análise de mercado e concorrência', 'Modelo de negócio e proposta de valor',
              'Case: expansão de uma indústria catarinense', 'Estratégia Empresarial: vantagem competitiva',
              'Planejamento estratégico na prática', 'OKRs e execução', 'Workshop: plano estratégico do seu negócio'])[n],
       'Traga o canvas do seu negócio atualizado.',
       pg_temp.at_local((n - 5) * 7, '19:00'), pg_temp.at_local((n - 5) * 7, '22:00'),
       (array['class','class','class','case','class','class','class','workshop'])[n]::public.lesson_type,
       'in_person', 'Academia FIESC', 'Sala 02', 'd0000000-0000-4000-8000-00000000000a',
       case when n < 5 then 'completed' else 'scheduled' end::public.lesson_status, n = 5
from generate_series(1, 8) n;

insert into public.lessons (subject_id, cohort_id, title, starts_at, ends_at, lesson_type, modality, location, room, online_provider, meeting_url, guest_name, guest_title, status)
select 'd2000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000001',
       (array['Finanças para fundadores', 'Fluxo de caixa e unit economics', 'Valuation na prática', 'Masterclass: como investidores avaliam startups', 'Captação: anjo, seed e venture capital'])[n],
       pg_temp.at_local(-12 + (n - 1) * 7, '19:00'), pg_temp.at_local(-12 + (n - 1) * 7, '22:00'),
       case when n = 4 then 'masterclass' else 'class' end::public.lesson_type,
       case when n = 3 then 'online' else 'in_person' end::public.lesson_modality,
       case when n = 3 then null else 'Academia FIESC' end, case when n = 3 then null else 'Sala 05' end,
       case when n = 3 then 'meet' end::public.online_provider, case when n = 3 then 'https://meet.google.com/demo-neo-fin' end,
       case when n = 4 then 'Investidora convidada' end, case when n = 4 then 'Sócia de fundo de VC' end,
       case when n <= 2 then 'completed' else 'scheduled' end::public.lesson_status
from generate_series(1, 5) n;

-- Attendance for past lessons (Marina ~90%, others varied)
insert into public.attendance (lesson_id, student_id, status, method, recorded_by)
select l.id, e.user_id,
       case
         when e.user_id = 'd0000000-0000-4000-8000-000000000001' then case when l.title = 'Feedback e cultura' then 'absent' else 'present' end
         when e.user_id = 'd0000000-0000-4000-8000-000000000004' then case when (extract(day from l.starts_at)::int % 3) = 0 then 'present' else 'absent' end
         when (extract(day from l.starts_at)::int % 5) = 0 then 'late'
         else 'present'
       end::public.attendance_status,
       'manual', 'd0000000-0000-4000-8000-00000000000a'
from public.lessons l
join public.enrollments e on e.cohort_id = l.cohort_id
where l.cohort_id = 'd1000000-0000-4000-8000-000000000001' and l.starts_at < now() - interval '1 day';

-- Assignments
insert into public.assignments (id, subject_id, title, instructions, due_at, status, dimension, created_by) values
  ('d4000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'Mapa de autoconhecimento',
   'Preencha o mapa de forças e pontos de desenvolvimento.', pg_temp.at_local(-45, '23:59'), 'closed', 'learning', 'd0000000-0000-4000-8000-00000000000a'),
  ('d4000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'Análise competitiva do seu negócio',
   'Mapeie 5 concorrentes diretos e indiretos e posicione seu negócio.', pg_temp.at_local(3, '23:59'), 'published', 'execution', 'd0000000-0000-4000-8000-00000000000a'),
  ('d4000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000003', 'Projeção financeira de 12 meses',
   'Monte a projeção de receitas, custos e caixa para os próximos 12 meses.', pg_temp.at_local(9, '23:59'), 'published', 'execution', 'd0000000-0000-4000-8000-00000000000c');
insert into public.assignment_submissions (assignment_id, student_id, content, status, submitted_at, score, feedback, reviewed_by, reviewed_at)
select 'd4000000-0000-4000-8000-000000000001', u, 'Mapa entregue.', 'reviewed', now() - interval '46 days', 9, 'Ótima reflexão sobre estilo de liderança.', 'd0000000-0000-4000-8000-00000000000a', now() - interval '40 days'
from unnest(array['d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003']::uuid[]) u;

-- --------------------------------------------------------------- mentoring ---
insert into public.mentor_assignments (mentor_id, student_id, focus, assigned_by) values
  ('d0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000001', 'Go-to-market e primeiras vendas', 'd0000000-0000-4000-8000-00000000000c'),
  ('d0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000003', 'Validação do MVP', 'd0000000-0000-4000-8000-00000000000c');

insert into public.mentoring_sessions (id, mentor_id, student_id, scheduled_at, duration_min, modality, meeting_url, topics, status,
  summary, difficulties, decisions, completed_at) values
  ('d5000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000001',
   pg_temp.at_local(-28, '15:00'), 60, 'online', 'https://meet.google.com/demo-mentoria', '{Validação,Entrevistas}', 'completed',
   'Revisamos as entrevistas com produtores e o roteiro para restaurantes.', 'Dificuldade em agendar conversas com chefs.',
   'Focar em restaurantes de médio porte no centro.', now() - interval '28 days'),
  ('d5000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000001',
   pg_temp.at_local(-10, '15:00'), 60, 'online', 'https://meet.google.com/demo-mentoria', '{Pricing,MVP}', 'completed',
   'MVP em teste com 6 restaurantes. Discutimos modelo de comissão vs. assinatura.', 'Margem apertada no frete.',
   'Testar assinatura mensal com 3 restaurantes.', now() - interval '10 days'),
  ('d5000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000001',
   pg_temp.at_local(2, '15:00'), 60, 'online', 'https://meet.google.com/demo-mentoria', '{Vendas,Projeção financeira}', 'scheduled',
   null, null, null, null),
  ('d5000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000003',
   pg_temp.at_local(5, '10:00'), 45, 'in_person', null, '{MVP}', 'scheduled', null, null, null, null);

insert into public.mentoring_private_notes (student_id, session_id, author_id, content) values
  ('d0000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-00000000000b',
   'Marina evolui rápido, mas tende a postergar decisões de preço. Cobrar definição na próxima sessão.');

insert into public.mentoring_action_items (session_id, student_id, title, due_date, status, sort_order, created_by) values
  ('d5000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Entrevistar 10 clientes', current_date - 2, 'done', 1, 'd0000000-0000-4000-8000-00000000000b'),
  ('d5000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Revisar pricing', current_date + 4, 'open', 2, 'd0000000-0000-4000-8000-00000000000b'),
  ('d5000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Atualizar projeção financeira', current_date + 4, 'open', 3, 'd0000000-0000-4000-8000-00000000000b');

insert into public.goals (owner_id, created_by, source, title, dimension, due_date, status, progress) values
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'self', 'Fechar 5 restaurantes pagantes', 'venture', current_date + 45, 'in_progress', 40),
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000b', 'mentoring', 'Definir modelo de preço', 'execution', current_date + 7, 'in_progress', 60),
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'self', 'Lançar o MVP', 'venture', current_date - 20, 'done', 100);

-- ----------------------------------------------------------------- venture ---
insert into public.ventures (id, owner_id, name, tagline, description, segment, business_model, stage, problem, solution, audience,
  value_proposition, revenue_model, team_description, website_url, visibility)
values ('d6000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Agrovia',
  'Do campo para a cozinha, sem atravessadores.',
  'Marketplace que conecta pequenos produtores rurais a restaurantes da Grande Florianópolis.',
  'AgroTech', 'Marketplace B2B', 'ideation',
  'Restaurantes pagam caro e têm baixa previsibilidade de insumos frescos; produtores vendem barato para atravessadores.',
  'Plataforma de pedidos recorrentes com logística compartilhada.',
  'Restaurantes de médio porte e pequenos produtores da região.',
  'Insumos mais frescos, preço justo e entrega programada.',
  'Assinatura mensal para restaurantes + comissão por pedido.',
  'Marina (CEO) e um sócio técnico em meio período.', 'https://agrovia.demo', 'community');
-- Walk the stage history so the timeline shows the evolution
update public.ventures set stage = 'validation' where id = 'd6000000-0000-4000-8000-000000000001';
update public.ventures set stage = 'mvp' where id = 'd6000000-0000-4000-8000-000000000001';
update public.venture_stage_history set changed_at = now() - interval '70 days' where venture_id = 'd6000000-0000-4000-8000-000000000001' and to_stage = 'ideation';
update public.venture_stage_history set changed_at = now() - interval '45 days' where venture_id = 'd6000000-0000-4000-8000-000000000001' and to_stage = 'validation';
update public.venture_stage_history set changed_at = now() - interval '20 days' where venture_id = 'd6000000-0000-4000-8000-000000000001' and to_stage = 'mvp';
update public.activity_events set occurred_at = h.changed_at
  from public.venture_stage_history h
 where activity_events.ref_id = h.venture_id and activity_events.type = 'venture_stage'
   and activity_events.metadata ->> 'to' = h.to_stage::text;

insert into public.ventures (owner_id, name, tagline, segment, stage, visibility)
values ('d0000000-0000-4000-8000-000000000003', 'Lume Saúde', 'Agenda inteligente para clínicas', 'HealthTech', 'validation', 'private');

insert into public.venture_milestones (venture_id, template_id, title, status, achieved_at, sort_order)
select 'd6000000-0000-4000-8000-000000000001', mt.id, mt.title,
       case when mt.sort_order <= 3 then 'achieved' else 'pending' end::public.milestone_status,
       case when mt.sort_order <= 3 then now() - ((4 - mt.sort_order) * interval '18 days') end, mt.sort_order
from public.milestone_templates mt where mt.track = 'founder';

with k as (
  insert into public.venture_kpis (venture_id, definition_id, unit, target_value, sort_order)
  select 'd6000000-0000-4000-8000-000000000001', d.id, d.unit, t.target, t.ord
  from public.kpi_definitions d
  join (values ('customers', 5, 1), ('leads', 60, 2), ('revenue', 10000, 3)) t(key, target, ord) on t.key = d.key
  returning id, definition_id
)
insert into public.venture_kpi_values (venture_kpi_id, period_start, value)
select k.id, (date_trunc('month', current_date) - (m * interval '1 month'))::date,
       case d.key when 'customers' then (array[2, 1, 0, 0])[m + 1]
                  when 'leads' then (array[41, 25, 12, 4])[m + 1]
                  else (array[2100, 800, 0, 0])[m + 1] end
from k join public.kpi_definitions d on d.id = k.definition_id, generate_series(0, 3) m;

insert into public.venture_objectives (id, venture_id, title, period_label, due_date, status) values
  ('d7000000-0000-4000-8000-000000000001', 'd6000000-0000-4000-8000-000000000001', 'Conquistar os primeiros clientes pagantes', 'Próximos 60 dias', current_date + 60, 'in_progress');
insert into public.venture_key_results (objective_id, title, unit, start_value, target_value, current_value, sort_order) values
  ('d7000000-0000-4000-8000-000000000001', 'Restaurantes pagantes', 'restaurantes', 0, 5, 2, 1),
  ('d7000000-0000-4000-8000-000000000001', 'Restaurantes em teste', 'restaurantes', 0, 10, 6, 2),
  ('d7000000-0000-4000-8000-000000000001', 'Receita mensal', 'R$', 0, 10000, 2100, 3);
insert into public.venture_actions (venture_id, objective_id, title, owner_id, due_date, status, sort_order) values
  ('d6000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000001', 'Lançar landing page', 'd0000000-0000-4000-8000-000000000001', current_date - 25, 'done', 1),
  ('d6000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000001', 'Criar tabela de preços', 'd0000000-0000-4000-8000-000000000001', current_date - 5, 'done', 2),
  ('d6000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000001', 'Visitar 15 restaurantes no centro', 'd0000000-0000-4000-8000-000000000001', current_date + 12, 'in_progress', 3),
  ('d6000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000001', 'Contratar entregador parceiro', 'd0000000-0000-4000-8000-000000000001', current_date + 8, 'blocked', 4),
  ('d6000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000001', 'Estruturar contrato de assinatura', 'd0000000-0000-4000-8000-000000000001', current_date + 20, 'not_started', 5);
insert into public.venture_comments (venture_id, objective_id, author_id, body) values
  ('d6000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000b',
   'Boa evolução! Priorize a logística antes de escalar visitas — é o que vai segurar a retenção.');

-- -------------------------------------------------------------- experiences --
insert into public.experiences (id, category, title, description, starts_at, ends_at, location, capacity, owner_id, guests, companies, cohort_id, status, is_educational) values
  ('d8000000-0000-4000-8000-000000000001', 'neomeeting', 'Neomeeting: Liderança em empresas familiares',
   'Bate-papo com herdeiros que assumiram empresas de suas famílias.', pg_temp.at_local(-20, '18:30'), pg_temp.at_local(-20, '21:00'),
   'Academia FIESC — Auditório', 40, 'd0000000-0000-4000-8000-00000000000c', 'Empresários convidados', '{}', 'd1000000-0000-4000-8000-000000000001', 'completed', true),
  ('d8000000-0000-4000-8000-000000000002', 'company_visit', 'Visita Empresarial: Indústria de Tecnologia',
   'Visita guiada à fábrica e conversa com a diretoria sobre inovação e expansão.', pg_temp.at_local(6, '08:30'), pg_temp.at_local(6, '13:00'),
   'Joinville, SC', 15, 'd0000000-0000-4000-8000-00000000000c', null, '{Indústria Demo S.A.}', 'd1000000-0000-4000-8000-000000000001', 'published', true),
  ('d8000000-0000-4000-8000-000000000003', 'conexao_neo', 'Conexão Neo: Investidores-anjo',
   'Rodada de conversas com investidores-anjo da região.', pg_temp.at_local(16, '19:00'), pg_temp.at_local(16, '22:00'),
   'Florianópolis, SC', 30, 'd0000000-0000-4000-8000-00000000000c', 'Rede de anjos convidada', '{}', 'd1000000-0000-4000-8000-000000000001', 'published', true);
insert into public.experience_registrations (experience_id, user_id, status, checked_in_at) values
  ('d8000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'attended', pg_temp.at_local(-20, '18:35')),
  ('d8000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'attended', pg_temp.at_local(-20, '18:40')),
  ('d8000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'confirmed', null),
  ('d8000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'confirmed', null);
insert into public.experience_reflections (experience_id, user_id, main_learning, application, rating) values
  ('d8000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
   'Governança começa cedo: acordos claros evitam conflitos quando o negócio cresce.',
   'Formalizar o acordo de sócios da Agrovia antes de captar.', 5);

-- ------------------------------------------------------------ announcements --
insert into public.announcements (id, title, body, type, author_id, status, publish_at, is_pinned, requires_ack) values
  ('d9000000-0000-4000-8000-000000000001', 'Bem-vindos à plataforma NeoLevel',
   'Aqui você acompanha aulas, Neomentorias, seu negócio, experiências e a comunidade. Explore e atualize seu perfil!',
   'institutional', 'd0000000-0000-4000-8000-00000000000c', 'published', now() - interval '30 days', true, false),
  ('d9000000-0000-4000-8000-000000000002', 'Aula de Estratégia hoje na Sala 02',
   'A aula de hoje às 19h será na Sala 02 da Academia FIESC. Traga o canvas do seu negócio atualizado.',
   'academic', 'd0000000-0000-4000-8000-00000000000c', 'published', now() - interval '3 hours', false, false),
  ('d9000000-0000-4000-8000-000000000003', 'Inscrições abertas: Visita Empresarial',
   'Restam poucas vagas para a visita à indústria em Joinville. Confirme sua presença em Experiências Neo.',
   'event', 'd0000000-0000-4000-8000-00000000000c', 'published', now() - interval '2 days', false, false);
insert into public.announcement_targets (announcement_id, target_type, target_id)
select a, 'cohort', 'd1000000-0000-4000-8000-000000000001'
from unnest(array['d9000000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000002', 'd9000000-0000-4000-8000-000000000003']::uuid[]) a;
insert into public.announcement_reads (announcement_id, user_id) values
  ('d9000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001');
update public.announcements set notified_at = now() where author_id = 'd0000000-0000-4000-8000-00000000000c';

-- ---------------------------------------------------------------- documents --
insert into public.documents (id, title, description, category, status, created_by) values
  ('da000000-0000-4000-8000-000000000001', 'Regulamento NeoLevel 2026', 'Regras acadêmicas, frequência e avaliação.', 'academic', 'required_reading', 'd0000000-0000-4000-8000-00000000000c');
insert into public.document_targets (document_id, target_type, target_id)
values ('da000000-0000-4000-8000-000000000001', 'cohort', 'd1000000-0000-4000-8000-000000000001');
insert into public.documents (title, description, category, status, owner_user_id, requires_signature, created_by) values
  ('Termo de uso de imagem', 'Autorização para uso de imagem em eventos NeoLevel.', 'term', 'signature_pending',
   'd0000000-0000-4000-8000-000000000001', true, 'd0000000-0000-4000-8000-00000000000c');

-- ------------------------------------------------------------------ journey --
insert into public.journey_milestones (cohort_id, kind, title, description, planned_start, planned_end, subject_id, experience_id, requirements, sort_order) values
  ('d1000000-0000-4000-8000-000000000001', 'event', 'Imersão de boas-vindas', 'Integração da turma e apresentação da jornada.', current_date - 90, current_date - 88, null, null, '[]', 1),
  ('d1000000-0000-4000-8000-000000000001', 'milestone', 'Diagnóstico do Neoleader', 'Mapeamento de perfil, objetivos e ponto de partida do negócio.', current_date - 80, current_date - 75, null, null, '[]', 2),
  ('d1000000-0000-4000-8000-000000000001', 'subject', 'Ciclo 1 · Liderança e Soft Skills', null, current_date - 90, current_date - 31, 'd2000000-0000-4000-8000-000000000001', null, '[]', 3),
  ('d1000000-0000-4000-8000-000000000001', 'subject', 'Ciclo 2 · Estratégia Empresarial', null, current_date - 30, current_date + 30, 'd2000000-0000-4000-8000-000000000002', null, '[]', 4),
  ('d1000000-0000-4000-8000-000000000001', 'company_visit', 'Primeira Visita Empresarial', null, current_date + 6, current_date + 6, null, 'd8000000-0000-4000-8000-000000000002', '[]', 5),
  ('d1000000-0000-4000-8000-000000000001', 'panel', 'Banca de Validação', 'Apresentação do negócio validado para a banca NeoLevel.', current_date + 45, current_date + 45, null, null,
   '[{"label": "Validação concluída na trilha", "type": "checkpoint", "key": "validation"},
     {"label": "Negócio no estágio MVP", "type": "venture_stage", "stage": "mvp"},
     {"label": "3 Neomentorias concluídas", "type": "mentorings", "count": 3},
     {"label": "Frequência mínima de 75%", "type": "attendance", "min": 75}]', 6),
  ('d1000000-0000-4000-8000-000000000001', 'experience', 'Missão Empresarial', 'Imersão de uma semana em um polo de inovação.', current_date + 200, current_date + 206, null, null, '[]', 7),
  ('d1000000-0000-4000-8000-000000000001', 'panel', 'Banca Final de Venture Capital', 'Pitch para investidores convidados.', current_date + 560, current_date + 560, null, null,
   '[{"label": "Negócio em Tração", "type": "venture_stage", "stage": "traction"},
     {"label": "R$ 10 mil de receita", "type": "milestone", "title": "R$ 10 mil de receita"}]', 8),
  ('d1000000-0000-4000-8000-000000000001', 'certification', 'Certificação NeoLevel', 'Conclusão da jornada de dois anos.', current_date + 640, current_date + 640, null, null,
   '[{"label": "Frequência mínima de 75%", "type": "attendance", "min": 75}]', 9);
insert into public.journey_completions (milestone_id, user_id, completed_at)
select jm.id, e.user_id, now() - interval '76 days'
from public.journey_milestones jm join public.enrollments e on e.cohort_id = jm.cohort_id
where jm.title = 'Diagnóstico do Neoleader';

-- ------------------------------------------------- notifications (curated) ----
delete from public.notifications where user_id::text like 'd0000000-0000-4000-8000-%';
insert into public.notifications (user_id, type, title, body, link, created_at) values
  ('d0000000-0000-4000-8000-000000000001', 'mentoring_new', 'Mentoria agendada', 'Com Carla Menezes em 2 dias, às 15h', '/mentorias', now() - interval '1 day'),
  ('d0000000-0000-4000-8000-000000000001', 'assignment_new', 'Nova atividade: Projeção financeira de 12 meses', 'Prazo em 9 dias', '/disciplinas', now() - interval '2 days'),
  ('d0000000-0000-4000-8000-000000000001', 'announcement', 'Aula de Estratégia hoje na Sala 02', null, '/comunicados', now() - interval '3 hours');
