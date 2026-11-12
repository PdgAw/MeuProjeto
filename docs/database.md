# Banco de dados NeoLevel (Supabase / PostgreSQL)

Todas as tabelas ficam no schema `public`, com **RLS habilitado em 100% delas**.
Autorização é decidida no banco — o front-end apenas reflete o que o banco permite.

## Migrations

| Arquivo | Domínio |
|---|---|
| `0100_identity_rbac` | `profiles`, `profile_private` (contato), `profile_details` (bio + privacidade), `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permissions` (grant/revoke individual), funções `has_permission`, `has_role`, `is_super_admin`, `my_permissions` |
| `0200_cohorts_neoleaders` | `cohorts`, `enrollments`, `neoleader_profiles` (trilha), `family_businesses`, `track_checkpoints`, `neoleader_checkpoints`, `professional_profiles`; escopo `can_view_student`, `teaches_student`, `mentors_student` |
| `0300_academic` | `subjects`, `subject_teachers`, `subject_cohorts`, `competencies`, `lessons`, `lesson_materials`, `assignments`, `assignment_submissions`, `attendance`; RPC `self_check_in` |
| `0400_mentoring_goals` | `mentor_assignments`, `mentoring_sessions`, `mentoring_private_notes`, `mentoring_action_items`, `goals`; RPCs `request_mentoring`, `complete_mentoring_session`, `cancel_mentoring_session` |
| `0500_ventures` | `ventures`, `venture_members`, `venture_stage_history`, `kpi_definitions`, `venture_kpis`, `venture_kpi_values`, `milestone_templates`, `venture_milestones`, `venture_objectives`, `venture_key_results`, `venture_actions`, `venture_comments` |
| `0600_panels_experiences_community` | Bancas (`panel_rounds`, `panel_criteria`, `panel_evaluators`, `pitch_submissions`, `pitch_evaluations`, `pitch_scores`, `pitch_decisions`, RPC `pitch_results`), Experiências (`experiences`, `experience_registrations`, `experience_reflections`, `experience_media`, RPCs de inscrição com lista de espera), Comunidade (`connections`, RPC `community_directory`) |
| `0700_communication` | Chat (`conversations`, `conversation_members`, `messages` com busca full-text), Comunicados (`announcements`, `announcement_targets`, `announcement_reads`, RPC `announcement_stats`), Documentos (`documents`, `document_versions`, `document_targets`, `document_acknowledgements`), Agenda (`calendar_events`, RPC `my_agenda`) |
| `0800_admissions_requests_finance` | Admissões (`candidates`, histórico, `interview_templates`, `candidate_interviews`, `committee_reviews`, RPC `convert_candidate_to_neoleader`), Solicitações, Financeiro acadêmico |
| `0900_progress_activity_notifications` | `notifications` (+ triggers e jobs pg_cron), `push_subscriptions`, `activity_events` (timeline 360º), `progress_dimension_settings` + RPC `neo_progress`, `journey_milestones`, RPCs `current_user_context`, `complete_first_access` |
| `1000_storage_realtime` | 9 buckets com políticas por pasta; Realtime em mensagens e notificações |
| `1100_reference_data` | Cargos, permissões, trilhas, competências, disciplinas iniciais, milestones, KPIs, pesos do Neo Progress |
| `1200_harden_function_privileges` | Visitantes (`anon`) não executam funções; triggers e jobs internos fora da API |

## Modelo de permissões

`has_permission(chave)` = Super Admin **ou** grant individual **ou** (permissão do cargo **e não** revogada individualmente).
Usuários `inactive`, `suspended` e `alumni` perdem todas as permissões.

Escopo além de permissões:
- **Professor**: vê apenas Neoleaders das turmas onde leciona.
- **Neomentor**: vê apenas mentorados ativos (e a empresa familiar, se o aluno permitir).
- **Notas privadas de mentoria**: tabela separada; o Neoleader nunca as lê, mesmo via API.
- **Comunidade**: e-mail/telefone nunca expostos; demais campos respeitam `profile_details.privacy`.
- **Bancas**: Neoleader vê o próprio pitch, nunca notas; resultados exigem `panels.results`.

## Aplicar no Supabase hospedado

```bash
SUPABASE_PROJECT_REF=aoutklwhwkomvtlinxcq SUPABASE_ACCESS_TOKEN=sbp_... supabase/scripts/apply_remote.sh
```

O script usa a Management API (HTTPS), aplica só migrations pendentes — cada uma em uma transação —
e registra em `supabase_migrations.schema_migrations` (compatível com a CLI).
Tipos TypeScript: `src/types/database.ts`, gerados do banco real.

## Testes

```bash
# Postgres local (não precisa de Docker) — usa um shim que imita auth/storage do Supabase
PGHOST=/tmp PGPORT=54329 supabase/tests/run_tests.sh
```
