-- Demo data for management screens (admissions, finance, requests). Removable with demo_remove.sql.
create or replace function pg_temp.local_today() returns date language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- ------------------------------------------------------------- Admissões ------
insert into public.candidates (id, full_name, email, phone, birth_date, city, profile_type, goals, experience, company, entrepreneurial_stage, lead_source, notes, status, target_cohort_id, owner_id, created_at) values
  ('dc000000-0000-4000-8000-000000000001', 'Bruno Tavares', 'bruno.tavares@demo.neolevel.local', '(48) 90000-0001', '2004-03-12', 'Florianópolis', 'founder', 'Validar um app de logística para pequenos e-commerces.', 'Estágio em startup de pagamentos.', null, 'Ideia', 'Instagram', null, 'new_lead', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000c', now() - interval '3 days'),
  ('dc000000-0000-4000-8000-000000000002', 'Lívia Moretti', 'livia.moretti@demo.neolevel.local', '(47) 90000-0002', '2002-07-30', 'Blumenau', 'successor', 'Preparar-se para assumir a diretoria comercial da empresa da família.', 'Analista comercial há 2 anos.', 'Moretti Malhas', 'Empresa familiar', 'Indicação de ex-aluno', null, 'application_received', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000c', now() - interval '9 days'),
  ('dc000000-0000-4000-8000-000000000003', 'Caio Nunes', 'caio.nunes@demo.neolevel.local', '(48) 90000-0003', '2003-11-02', 'São José', 'founder', 'Escalar uma marca de cafés especiais.', 'Fundou um e-commerce de cafés.', 'Nunes Café', 'Operação', 'Evento FIESC', null, 'screening', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000c', now() - interval '15 days'),
  ('dc000000-0000-4000-8000-000000000004', 'Helena Duarte', 'helena.duarte@demo.neolevel.local', '(48) 90000-0004', '2001-05-18', 'Florianópolis', 'founder', 'Estruturar uma healthtech de telemonitoramento.', 'Enfermeira e pesquisadora.', null, 'Validação', 'Site NeoLevel', null, 'interview', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000c', now() - interval '20 days'),
  ('dc000000-0000-4000-8000-000000000005', 'Otávio Reis', 'otavio.reis@demo.neolevel.local', '(49) 90000-0005', '2000-01-25', 'Chapecó', 'successor', 'Profissionalizar a gestão do frigorífico familiar.', 'Gerente de produção.', 'Frigorífico Reis', 'Empresa familiar', 'LinkedIn', 'Família muito engajada no processo.', 'committee', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000c', now() - interval '28 days'),
  ('dc000000-0000-4000-8000-000000000006', 'Sofia Lima', 'sofia.lima@demo.neolevel.local', '(48) 90000-0006', '2005-09-09', 'Palhoça', 'founder', 'Lançar uma edtech de educação financeira.', 'Criadora de conteúdo.', null, 'Ideia', 'Instagram', null, 'approved', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000c', now() - interval '35 days'),
  ('dc000000-0000-4000-8000-000000000007', 'Gustavo Pereira', 'gustavo.pereira@demo.neolevel.local', '(48) 90000-0007', '2003-02-14', 'Biguaçu', 'founder', 'Explorar ideias em agro.', 'Universitário.', null, 'Ideia', 'Indicação', 'Pouca disponibilidade no momento.', 'waitlist', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000c', now() - interval '40 days')
on conflict (id) do nothing;

insert into public.candidate_interviews (candidate_id, template_id, interviewer_id, scheduled_at, answers, summary, recommendation, completed_at)
select c.id, t.id, 'd0000000-0000-4000-8000-00000000000c', now() - interval '10 days',
  jsonb_build_object('motivation', 'Quer acelerar o negócio com rede e método.', 'profile', 'First-time Founder', 'commitment', 5, 'fit', 4, 'availability', true),
  'Muito alinhada ao propósito da NeoLevel. Recomendo seguir.', 'advance', now() - interval '10 days'
from public.candidates c, public.interview_templates t
where c.id in ('dc000000-0000-4000-8000-000000000005', 'dc000000-0000-4000-8000-000000000006') and t.name = 'Entrevista de alinhamento'
and not exists (select 1 from public.candidate_interviews i where i.candidate_id = c.id);

insert into public.committee_reviews (candidate_id, reviewer_id, score, decision, comment) values
  ('dc000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-00000000000c', 8.5, 'approve', 'Perfil empreendedor claro e boa disponibilidade.')
on conflict do nothing;

-- ------------------------------------------------- Financeiro acadêmico ------
insert into public.financial_agreements (id, student_id, cohort_id, total_amount, installments_count, start_date, status, created_by)
select ('dd000000-0000-4000-8000-00000000000' || n)::uuid, s, 'd1000000-0000-4000-8000-000000000001', 36000, 24, date_trunc('month', pg_temp.local_today() - 90)::date, 'active', 'd0000000-0000-4000-8000-00000000000c'
from (values (1, 'd0000000-0000-4000-8000-000000000001'::uuid), (2, 'd0000000-0000-4000-8000-000000000002'::uuid), (3, 'd0000000-0000-4000-8000-000000000003'::uuid), (4, 'd0000000-0000-4000-8000-000000000004'::uuid)) x(n, s)
on conflict (id) do nothing;
insert into public.financial_adjustments (agreement_id, kind, percent, reason, valid_from, approved_by)
values ('dd000000-0000-4000-8000-000000000003', 'scholarship', 30, 'Bolsa mérito — processo seletivo', pg_temp.local_today() - 90, 'd0000000-0000-4000-8000-00000000000c');
insert into public.tuition_installments (agreement_id, number, due_date, amount, status, paid_at, payment_method)
select a.id, n, (a.start_date + make_interval(months => n - 1))::date,
       case when a.id = 'dd000000-0000-4000-8000-000000000003' then 1050 else 1500 end,
       case when (a.start_date + make_interval(months => n - 1))::date >= pg_temp.local_today() then 'pending'
            when a.id = 'dd000000-0000-4000-8000-000000000004' and n = 3 then 'overdue'
            else 'paid' end::public.installment_status,
       case when (a.start_date + make_interval(months => n - 1))::date < pg_temp.local_today() and not (a.id = 'dd000000-0000-4000-8000-000000000004' and n = 3)
            then (a.start_date + make_interval(months => n - 1))::timestamptz end,
       case when (a.start_date + make_interval(months => n - 1))::date < pg_temp.local_today() and not (a.id = 'dd000000-0000-4000-8000-000000000004' and n = 3) then 'Boleto' end
from public.financial_agreements a, generate_series(1, 24) n
where a.id::text like 'dd000000-%'
on conflict (agreement_id, number) do nothing;

-- ------------------------------------------------------------ Solicitações ------
insert into public.service_requests (id, requester_id, type, subject, description, status, priority, created_at) values
  ('de000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'declaration', 'Declaração de matrícula', 'Preciso para apresentar ao banco no financiamento do negócio.', 'open', 'normal', now() - interval '1 day'),
  ('de000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'profile_change', 'Atualizar endereço', 'Mudei para Florianópolis.', 'in_review', 'low', now() - interval '4 days'),
  ('de000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004', 'academic_issue', 'Reposição de aula', 'Perdi duas aulas de Finanças por viagem a trabalho.', 'awaiting_user', 'high', now() - interval '6 days')
on conflict (id) do nothing;
insert into public.service_request_comments (request_id, author_id, body, is_internal) values
  ('de000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-00000000000c', 'Pode enviar os comprovantes da viagem?', false),
  ('de000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-00000000000c', 'Verificar com o professor de Finanças disponibilidade de reposição.', true);
select 'demo management ready' as result;
