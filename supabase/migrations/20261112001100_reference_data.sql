-- =============================================================================
-- NeoLevel · 1100 · Reference data required in every environment.
-- Everything here is editable data — nothing is hardcoded in the app.
-- Idempotent: safe to re-run.
-- =============================================================================

-- Permissions ------------------------------------------------------------------
insert into public.permissions (key, module, description) values
  ('users.view', 'users', 'Ver usuários e dados de contato'),
  ('users.create', 'users', 'Convidar/cadastrar usuários'),
  ('users.edit', 'users', 'Editar usuários e status'),
  ('users.delete', 'users', 'Excluir usuários'),
  ('students.view', 'students', 'Ver todos os Neoleaders (Visão 360º)'),
  ('students.edit', 'students', 'Editar Neoleaders, trilha e matrículas'),
  ('classes.view', 'classes', 'Ver turmas e seus indicadores'),
  ('classes.create', 'classes', 'Criar turmas'),
  ('classes.edit', 'classes', 'Editar turmas e jornada'),
  ('subjects.manage', 'academic', 'Gerenciar disciplinas e professores'),
  ('lessons.manage', 'academic', 'Gerenciar aulas de qualquer disciplina'),
  ('attendance.manage', 'academic', 'Registrar frequência de qualquer aula'),
  ('mentoring.view', 'mentoring', 'Ver mentorias de todos os Neoleaders'),
  ('mentoring.manage', 'mentoring', 'Vincular Neomentores e gerenciar mentorias'),
  ('ventures.view', 'ventures', 'Ver projetos empresariais de todos'),
  ('ventures.manage', 'ventures', 'Gerenciar projetos e milestones'),
  ('panels.manage', 'panels', 'Gerenciar bancas, critérios e avaliadores'),
  ('panels.evaluate', 'panels', 'Avaliar pitches como membro de banca'),
  ('panels.results', 'panels', 'Ver resultados confidenciais das bancas'),
  ('events.manage', 'events', 'Gerenciar Experiências Neo e agenda institucional'),
  ('communications.create', 'communications', 'Publicar comunicados e criar grupos'),
  ('documents.view', 'documents', 'Acessar a central de documentos'),
  ('documents.upload', 'documents', 'Enviar documentos'),
  ('documents.manage', 'documents', 'Gerenciar todos os documentos'),
  ('chat.manage', 'chat', 'Moderar conversas e grupos'),
  ('admissions.view', 'admissions', 'Ver pipeline de admissões'),
  ('admissions.manage', 'admissions', 'Gerenciar candidatos e matrículas'),
  ('admissions.committee', 'admissions', 'Avaliar candidatos no comitê'),
  ('finance.view', 'finance', 'Ver financeiro acadêmico'),
  ('finance.manage', 'finance', 'Gerenciar contratos, bolsas e parcelas'),
  ('requests.manage', 'requests', 'Atender solicitações'),
  ('reports.view', 'reports', 'Ver relatórios e dashboards de gestão'),
  ('settings.manage', 'settings', 'Configurações da plataforma'),
  ('permissions.manage', 'settings', 'Gerenciar cargos e permissões'),
  ('community.view', 'community', 'Acessar a Comunidade Neo')
on conflict (key) do update set module = excluded.module, description = excluded.description;

-- Roles ------------------------------------------------------------------------
insert into public.roles (key, name, description, dashboard, priority, is_system) values
  ('super_admin', 'Super Administrador', 'Acesso total à plataforma', 'direction', 1, true),
  ('director', 'Diretor', 'Direção da NeoLevel — visão executiva', 'direction', 10, true),
  ('coordinator', 'Coordenador', 'Coordenação acadêmica e de desenvolvimento', 'coordination', 20, true),
  ('secretary', 'Secretaria / Administrativo', 'Cadastros, matrículas, documentos e financeiro', 'secretary', 30, true),
  ('staff', 'Colaborador', 'Equipe interna NeoLevel', 'staff', 40, true),
  ('teacher', 'Professor', 'Professor ou professor convidado', 'teacher', 50, true),
  ('mentor', 'Neomentor', 'Mentor de Neoleaders', 'mentor', 60, true),
  ('neoleader', 'Neoleader', 'Aluno da NeoLevel', 'neoleader', 90, true)
on conflict (key) do update set name = excluded.name, description = excluded.description,
  dashboard = excluded.dashboard, priority = excluded.priority, is_system = true;

-- Role → permission bundles (super_admin needs none: it bypasses every check) ----
with bundle(role_key, perms) as (values
  ('director', array['users.view', 'students.view', 'classes.view', 'mentoring.view', 'ventures.view',
                     'panels.results', 'panels.evaluate', 'events.manage', 'communications.create',
                     'documents.view', 'documents.upload', 'admissions.view', 'admissions.committee',
                     'finance.view', 'reports.view', 'community.view']),
  ('coordinator', array['users.view', 'users.create', 'users.edit', 'students.view', 'students.edit',
                        'classes.view', 'classes.create', 'classes.edit', 'subjects.manage', 'lessons.manage',
                        'attendance.manage', 'mentoring.view', 'mentoring.manage', 'ventures.view',
                        'ventures.manage', 'panels.manage', 'panels.results', 'panels.evaluate', 'events.manage',
                        'communications.create', 'documents.view', 'documents.upload', 'documents.manage',
                        'chat.manage', 'admissions.view', 'admissions.manage', 'admissions.committee',
                        'requests.manage', 'reports.view', 'settings.manage', 'community.view']),
  ('secretary', array['users.view', 'users.create', 'users.edit', 'students.view', 'students.edit',
                      'classes.view', 'classes.create', 'classes.edit', 'attendance.manage', 'events.manage',
                      'communications.create', 'documents.view', 'documents.upload', 'documents.manage',
                      'admissions.view', 'admissions.manage', 'finance.view', 'finance.manage',
                      'requests.manage', 'community.view']),
  ('staff', array['documents.view', 'events.manage', 'requests.manage', 'community.view']),
  ('teacher', array['documents.view', 'documents.upload', 'community.view']),
  ('mentor', array['documents.view', 'community.view']),
  ('neoleader', array['documents.view', 'community.view'])
)
insert into public.role_permissions (role_id, permission_key)
select r.id, p from bundle b join public.roles r on r.key = b.role_key, unnest(b.perms) p
on conflict do nothing;

-- Track checkpoints ----------------------------------------------------------------
insert into public.track_checkpoints (track, key, title, description, sort_order) values
  ('founder', 'idea', 'Ideia', 'Ideia de negócio descrita com clareza', 1),
  ('founder', 'problem', 'Problema', 'Problema real identificado e descrito', 2),
  ('founder', 'solution', 'Solução', 'Solução proposta para o problema', 3),
  ('founder', 'validation', 'Validação', 'Problema e solução validados com clientes', 4),
  ('founder', 'business_model', 'Modelo de negócio', 'Como o negócio gera e captura valor', 5),
  ('founder', 'mvp', 'MVP', 'Produto mínimo viável lançado', 6),
  ('founder', 'first_customers', 'Primeiros clientes', 'Primeiros clientes pagantes', 7),
  ('founder', 'revenue', 'Receita', 'Receita recorrente ou consistente', 8),
  ('founder', 'traction', 'Tração', 'Crescimento consistente de clientes/receita', 9),
  ('founder', 'scale', 'Escala', 'Operação preparada para escalar', 10),
  ('successor', 'family_business', 'Empresa familiar', 'Conhecimento profundo da empresa da família', 1),
  ('successor', 'sector', 'Setor', 'Entendimento do setor e do mercado', 2),
  ('successor', 'structure', 'Estrutura', 'Estrutura societária e organizacional mapeada', 3),
  ('successor', 'current_role', 'Papel atual', 'Clareza sobre o papel atual na empresa', 4),
  ('successor', 'future_role', 'Papel futuro', 'Papel futuro definido com a família', 5),
  ('successor', 'governance', 'Governança', 'Práticas de governança compreendidas/implantadas', 6),
  ('successor', 'management', 'Gestão', 'Responsabilidades de gestão assumidas', 7),
  ('successor', 'professionalization', 'Profissionalização', 'Iniciativas de profissionalização lideradas', 8),
  ('successor', 'succession', 'Sucessão', 'Plano de sucessão discutido e formalizado', 9),
  ('successor', 'strategic_plan', 'Plano estratégico', 'Plano estratégico construído e apresentado', 10)
on conflict (track, key) do nothing;

-- Competencies ---------------------------------------------------------------------
insert into public.competencies (name) values
  ('Liderança'), ('Comunicação'), ('Negociação'), ('Visão estratégica'), ('Gestão financeira'),
  ('Marketing e vendas'), ('Inovação'), ('Tomada de decisão'), ('Gestão de pessoas'),
  ('Governança'), ('Inteligência artificial aplicada'), ('Networking')
on conflict (name) do nothing;

-- Initial subjects (data, editable/archivable by admins) ------------------------------
insert into public.subjects (code, name, description, status, dimensions, sort_order) values
  ('LID', 'Liderança e Soft Skills', 'Autoconhecimento, comunicação, influência e liderança de equipes.', 'active', '{learning}', 1),
  ('MKT', 'Marketing e Crescimento', 'Posicionamento, aquisição, vendas e growth para negócios reais.', 'active', '{learning,venture}', 2),
  ('FIN', 'Finanças e Investimentos', 'Finanças empresariais, valuation, captação e investimentos.', 'active', '{learning,venture}', 3),
  ('IAN', 'IA nos Negócios', 'Inteligência artificial aplicada à operação e à estratégia.', 'active', '{learning,execution}', 4),
  ('MAS', 'M&A e Sucessão', 'Fusões e aquisições, governança e sucessão em empresas familiares.', 'active', '{learning}', 5),
  ('EST', 'Estratégia Empresarial', 'Análise competitiva, modelo de negócio e planejamento estratégico.', 'active', '{learning,venture}', 6),
  ('PRJ', 'Desenvolvimento de Projeto Próprio', 'Construção e evolução do negócio do Neoleader ao longo da jornada.', 'active', '{venture,execution}', 7),
  ('CON', 'Conexão com o Mercado', 'Visitas, encontros com empresários e experiências práticas.', 'active', '{participation,experiences}', 8)
on conflict (code) do nothing;

insert into public.subject_competencies (subject_id, competency_id)
select s.id, c.id from (values
  ('LID', 'Liderança'), ('LID', 'Comunicação'), ('LID', 'Gestão de pessoas'),
  ('MKT', 'Marketing e vendas'), ('MKT', 'Inovação'),
  ('FIN', 'Gestão financeira'), ('FIN', 'Tomada de decisão'),
  ('IAN', 'Inteligência artificial aplicada'), ('IAN', 'Inovação'),
  ('MAS', 'Governança'), ('MAS', 'Negociação'),
  ('EST', 'Visão estratégica'), ('EST', 'Tomada de decisão'),
  ('PRJ', 'Inovação'), ('PRJ', 'Liderança'),
  ('CON', 'Networking'), ('CON', 'Comunicação')
) x(code, comp)
join public.subjects s on s.code = x.code join public.competencies c on c.name = x.comp
on conflict do nothing;

-- Milestone templates ------------------------------------------------------------------
insert into public.milestone_templates (title, stage, track, sort_order)
select t.title, t.stage::public.venture_stage, t.track::public.neoleader_track, t.ord
from (values
  ('Primeira entrevista com clientes', 'validation', 'founder', 1),
  ('Problema validado', 'validation', 'founder', 2),
  ('MVP lançado', 'mvp', 'founder', 3),
  ('Primeiro cliente', 'operation', 'founder', 4),
  ('R$ 10 mil de receita', 'traction', 'founder', 5),
  ('Primeiro funcionário', 'traction', 'founder', 6),
  ('Primeira rodada de investimento', 'scale', 'founder', 7),
  ('Diagnóstico da empresa familiar', null, 'successor', 1),
  ('Papel futuro acordado com a família', null, 'successor', 2),
  ('Conselho consultivo instalado', null, 'successor', 3),
  ('Plano de sucessão formalizado', null, 'successor', 4)
) t(title, stage, track, ord)
where not exists (select 1 from public.milestone_templates m where m.title = t.title);

-- KPI catalog ---------------------------------------------------------------------------
insert into public.kpi_definitions (key, name, unit, higher_is_better, is_system) values
  ('customers', 'Clientes', 'count', true, true),
  ('leads', 'Leads', 'count', true, true),
  ('mrr', 'MRR', 'currency', true, true),
  ('revenue', 'Receita', 'currency', true, true),
  ('costs', 'Custos', 'currency', false, true),
  ('margin', 'Margem', 'percent', true, true),
  ('growth', 'Crescimento', 'percent', true, true),
  ('nps', 'NPS', 'number', true, true),
  ('cac', 'CAC', 'currency', false, true),
  ('churn', 'Churn', 'percent', false, true)
on conflict (key) do nothing;

-- Neo Progress dimensions -----------------------------------------------------------------
insert into public.progress_dimension_settings (dimension, label, description, weight, sort_order, config) values
  ('learning', 'Aprendizado', 'Presença nas aulas e entregas acadêmicas', 1, 1, '{}'),
  ('execution', 'Execução', 'Ações do plano de execução e próximos passos concluídos', 1, 2, '{}'),
  ('mentoring', 'Mentorias', 'Frequência de Neomentorias nos últimos 90 dias', 1, 3, '{"target_sessions_90d": 3}'),
  ('participation', 'Participação', 'Presença em Experiências Neo e encontros', 1, 4, '{}'),
  ('venture', 'Projeto empresarial', 'Estágio, milestones e etapas da trilha', 1.5, 5, '{}'),
  ('experiences', 'Experiências', 'Aprendizados registrados após experiências', 1, 6, '{}'),
  ('goals', 'Metas', 'Progresso das metas pessoais e de mentoria', 1, 7, '{}')
on conflict (dimension) do nothing;

-- Default alignment interview -------------------------------------------------------------
insert into public.interview_templates (name, fields)
select 'Entrevista de alinhamento', '[
  {"key": "motivation", "label": "Por que a NeoLevel agora?", "type": "textarea", "required": true},
  {"key": "profile", "label": "Perfil", "type": "select", "options": ["First-time Founder", "Herdeiro / Sucessor", "Outro"], "required": true},
  {"key": "business", "label": "Negócio atual ou empresa da família", "type": "textarea"},
  {"key": "goals_2y", "label": "Onde quer estar em 2 anos?", "type": "textarea"},
  {"key": "availability", "label": "Disponibilidade para a jornada completa", "type": "boolean"},
  {"key": "commitment", "label": "Comprometimento percebido", "type": "scale", "min": 1, "max": 5},
  {"key": "fit", "label": "Fit com a proposta NeoLevel", "type": "scale", "min": 1, "max": 5},
  {"key": "notes", "label": "Observações do entrevistador", "type": "textarea"}
]'::jsonb
where not exists (select 1 from public.interview_templates where name = 'Entrevista de alinhamento');
