-- Demo panel round (removable with demo_remove.sql). Criteria are data, editable by coordination.
insert into public.panel_rounds (id, name, description, status, submissions_open_at, submissions_close_at, panel_date, location, created_by)
values ('db000000-0000-4000-8000-000000000001', 'Banca de Validação Demo',
  'Apresentação dos negócios validados para a banca NeoLevel. Pitch de 7 minutos + 8 de perguntas.',
  'open', now() - interval '2 days', now() + interval '30 days', now() + interval '45 days', 'Academia FIESC — Auditório',
  'd0000000-0000-4000-8000-00000000000c')
on conflict (id) do nothing;

insert into public.panel_criteria (round_id, name, description, weight, max_score, sort_order)
select 'db000000-0000-4000-8000-000000000001', c.name, c.descr, c.weight, 10, c.ord
from (values
  ('Problema', 'O problema é real, relevante e bem descrito?', 1.0, 1),
  ('Mercado', 'Tamanho e acessibilidade do mercado.', 1.0, 2),
  ('Solução', 'A solução resolve o problema de forma diferenciada?', 1.0, 3),
  ('Execução', 'Capacidade demonstrada de executar.', 1.5, 4),
  ('Tração', 'Evidências de validação e crescimento.', 1.5, 5),
  ('Modelo de negócio', 'Como o negócio captura valor de forma sustentável.', 1.0, 6),
  ('Equipe', 'Complementaridade e comprometimento.', 1.0, 7),
  ('Potencial de escala', 'Possibilidade de crescer rápido e de forma rentável.', 1.0, 8),
  ('Qualidade do pitch', 'Clareza, narrativa e domínio do tema.', 0.5, 9)
) c(name, descr, weight, ord)
where not exists (select 1 from public.panel_criteria where round_id = 'db000000-0000-4000-8000-000000000001');

insert into public.panel_evaluators (round_id, user_id) values
  ('db000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000b'),
  ('db000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000a')
on conflict do nothing;
select 'demo panel ready' as result;
