-- =============================================================================
-- NeoLevel · 0500 · Meu Negócio: ventures, KPIs, milestones, execution plan
-- =============================================================================

create type public.venture_stage as enum ('ideation', 'validation', 'mvp', 'operation', 'traction', 'scale');
create type public.venture_visibility as enum ('private', 'community');
create type public.kpi_unit as enum ('count', 'currency', 'percent', 'number');
create type public.action_status as enum ('not_started', 'in_progress', 'blocked', 'done');
create type public.milestone_status as enum ('pending', 'achieved');

create table public.ventures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  is_primary boolean not null default true,
  name text not null,
  logo_url text,
  tagline text,
  description text,
  segment text,
  business_model text,
  stage public.venture_stage not null default 'ideation',
  problem text,
  solution text,
  audience text,
  value_proposition text,
  revenue_model text,
  team_description text,
  website_url text,
  pitch_url text,
  pitch_deck_path text,                         -- bucket ventures
  -- 'community' exposes only the public card (name, logo, tagline, segment, stage)
  -- in Comunidade Neo; everything else stays private.
  visibility public.venture_visibility not null default 'private',
  last_update_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index ventures_one_primary_per_owner on public.ventures (owner_id) where is_primary;
create index ventures_stage_idx on public.ventures (stage);
create trigger ventures_updated_at before update on public.ventures
  for each row execute function public.set_updated_at();

create table public.venture_members (
  venture_id uuid not null references public.ventures (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text,
  primary key (venture_id, user_id)
);

create table public.venture_stage_history (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  from_stage public.venture_stage,
  to_stage public.venture_stage not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index venture_stage_history_venture_idx on public.venture_stage_history (venture_id, changed_at desc);

-- KPI catalog (system + custom) and the KPIs each Neoleader chooses -----------------
create table public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  unit public.kpi_unit not null default 'number',
  description text,
  higher_is_better boolean not null default true,
  is_system boolean not null default false
);

create table public.venture_kpis (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  definition_id uuid references public.kpi_definitions (id) on delete restrict,
  custom_name text,
  unit public.kpi_unit not null default 'number',
  target_value numeric,
  is_active boolean not null default true,
  sort_order int not null default 0,
  check (definition_id is not null or custom_name is not null)
);
create index venture_kpis_venture_idx on public.venture_kpis (venture_id);

create table public.venture_kpi_values (
  id uuid primary key default gen_random_uuid(),
  venture_kpi_id uuid not null references public.venture_kpis (id) on delete cascade,
  period_start date not null,
  value numeric not null,
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (venture_kpi_id, period_start)
);

-- Milestones: templates configured by admins + per-venture instances --------------
create table public.milestone_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  stage public.venture_stage,
  track public.neoleader_track,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.venture_milestones (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  template_id uuid references public.milestone_templates (id) on delete set null,
  title text not null,
  description text,
  target_date date,
  status public.milestone_status not null default 'pending',
  achieved_at timestamptz,
  evidence_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index venture_milestones_venture_idx on public.venture_milestones (venture_id);

-- Plano de Execução: Objetivo → Key Results → Ações ---------------------------------
create table public.venture_objectives (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  title text not null,
  description text,
  period_label text,
  due_date date,
  status public.action_status not null default 'not_started',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger venture_objectives_updated_at before update on public.venture_objectives
  for each row execute function public.set_updated_at();

create table public.venture_key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.venture_objectives (id) on delete cascade,
  title text not null,
  unit text,
  start_value numeric not null default 0,
  target_value numeric not null,
  current_value numeric not null default 0,
  sort_order int not null default 0
);

create table public.venture_actions (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  objective_id uuid references public.venture_objectives (id) on delete cascade,
  key_result_id uuid references public.venture_key_results (id) on delete set null,
  title text not null,
  owner_id uuid references public.profiles (id) on delete set null,
  owner_name text,                               -- responsible outside the platform
  due_date date,
  status public.action_status not null default 'not_started',
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venture_actions_venture_idx on public.venture_actions (venture_id, status);
create trigger venture_actions_updated_at before update on public.venture_actions
  for each row execute function public.set_updated_at();
create trigger venture_actions_completed before insert or update of status on public.venture_actions
  for each row execute function public.stamp_completed_at();

-- Neomentor / coordination comments on the venture or a specific plan item
create table public.venture_comments (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  objective_id uuid references public.venture_objectives (id) on delete cascade,
  action_id uuid references public.venture_actions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index venture_comments_venture_idx on public.venture_comments (venture_id, created_at desc);

-- =============================================================================
-- Helpers & triggers
-- =============================================================================
create or replace function public.is_venture_member(p_venture uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ventures v where v.id = p_venture and v.owner_id = p_user)
      or exists (select 1 from public.venture_members m where m.venture_id = p_venture and m.user_id = p_user)
$$;

create or replace function public.can_view_venture(p_venture uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_venture_member(p_venture, p_user)
      or public.has_permission('ventures.view', p_user)
      or exists (select 1 from public.ventures v where v.id = p_venture and public.mentors_student(v.owner_id, p_user))
$$;

create or replace function public.can_edit_venture(p_venture uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_venture_member(p_venture, p_user) or public.has_permission('ventures.manage', p_user)
$$;

create or replace function public.track_venture_stage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    insert into public.venture_stage_history (venture_id, from_stage, to_stage, changed_by)
    values (new.id, case when tg_op = 'UPDATE' then old.stage end, new.stage, auth.uid());
  end if;
  return new;
end $$;
create trigger ventures_stage_history after insert or update of stage on public.ventures
  for each row execute function public.track_venture_stage();

-- Any change in the venture or its plan refreshes last_update_at
-- (drives the "sem atualização do projeto há 30 dias" alert).
create or replace function public.touch_venture()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if tg_table_name = 'venture_kpi_values' then
    select venture_id into v_id from public.venture_kpis where id = coalesce(new.venture_kpi_id, old.venture_kpi_id);
  elsif tg_table_name = 'venture_key_results' then
    select venture_id into v_id from public.venture_objectives where id = coalesce(new.objective_id, old.objective_id);
  else
    v_id := coalesce(new.venture_id, old.venture_id);
  end if;
  update public.ventures set last_update_at = now() where id = v_id;
  return coalesce(new, old);
end $$;
create trigger touch_from_actions after insert or update or delete on public.venture_actions
  for each row execute function public.touch_venture();
create trigger touch_from_objectives after insert or update or delete on public.venture_objectives
  for each row execute function public.touch_venture();
create trigger touch_from_key_results after insert or update or delete on public.venture_key_results
  for each row execute function public.touch_venture();
create trigger touch_from_milestones after insert or update or delete on public.venture_milestones
  for each row execute function public.touch_venture();
create trigger touch_from_kpi_values after insert or update or delete on public.venture_kpi_values
  for each row execute function public.touch_venture();

create or replace function public.stamp_milestone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'achieved' and new.achieved_at is null then new.achieved_at := now(); end if;
  if new.status = 'pending' then new.achieved_at := null; end if;
  return new;
end $$;
create trigger venture_milestones_stamp before insert or update of status on public.venture_milestones
  for each row execute function public.stamp_milestone();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.ventures enable row level security;
alter table public.venture_members enable row level security;
alter table public.venture_stage_history enable row level security;
alter table public.kpi_definitions enable row level security;
alter table public.venture_kpis enable row level security;
alter table public.venture_kpi_values enable row level security;
alter table public.milestone_templates enable row level security;
alter table public.venture_milestones enable row level security;
alter table public.venture_objectives enable row level security;
alter table public.venture_key_results enable row level security;
alter table public.venture_actions enable row level security;
alter table public.venture_comments enable row level security;

create policy ventures_select on public.ventures for select to authenticated using (public.can_view_venture(id));
create policy ventures_insert on public.ventures for insert to authenticated
  with check (owner_id = (select auth.uid()) or (select public.has_permission('ventures.manage')));
create policy ventures_update on public.ventures for update to authenticated
  using (public.can_edit_venture(id)) with check (public.can_edit_venture(id));
create policy ventures_delete on public.ventures for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.has_permission('ventures.manage')));

create policy venture_members_select on public.venture_members for select to authenticated
  using (public.can_view_venture(venture_id));
create policy venture_members_write on public.venture_members for all to authenticated
  using (public.can_edit_venture(venture_id)) with check (public.can_edit_venture(venture_id));

create policy venture_stage_history_select on public.venture_stage_history for select to authenticated
  using (public.can_view_venture(venture_id));

create policy kpi_definitions_select on public.kpi_definitions for select to authenticated using (true);
create policy kpi_definitions_write on public.kpi_definitions for all to authenticated
  using ((select public.has_permission('settings.manage'))) with check ((select public.has_permission('settings.manage')));

create policy venture_kpis_select on public.venture_kpis for select to authenticated
  using (public.can_view_venture(venture_id));
create policy venture_kpis_write on public.venture_kpis for all to authenticated
  using (public.can_edit_venture(venture_id)) with check (public.can_edit_venture(venture_id));

create policy venture_kpi_values_select on public.venture_kpi_values for select to authenticated
  using (public.can_view_venture((select k.venture_id from public.venture_kpis k where k.id = venture_kpi_id)));
create policy venture_kpi_values_write on public.venture_kpi_values for all to authenticated
  using (public.can_edit_venture((select k.venture_id from public.venture_kpis k where k.id = venture_kpi_id)))
  with check (public.can_edit_venture((select k.venture_id from public.venture_kpis k where k.id = venture_kpi_id)));

create policy milestone_templates_select on public.milestone_templates for select to authenticated using (true);
create policy milestone_templates_write on public.milestone_templates for all to authenticated
  using ((select public.has_permission('ventures.manage'))) with check ((select public.has_permission('ventures.manage')));

create policy venture_milestones_select on public.venture_milestones for select to authenticated
  using (public.can_view_venture(venture_id));
create policy venture_milestones_write on public.venture_milestones for all to authenticated
  using (public.can_edit_venture(venture_id)) with check (public.can_edit_venture(venture_id));

create policy venture_objectives_select on public.venture_objectives for select to authenticated
  using (public.can_view_venture(venture_id));
create policy venture_objectives_write on public.venture_objectives for all to authenticated
  using (public.can_edit_venture(venture_id)) with check (public.can_edit_venture(venture_id));

create policy venture_key_results_select on public.venture_key_results for select to authenticated
  using (public.can_view_venture((select o.venture_id from public.venture_objectives o where o.id = objective_id)));
create policy venture_key_results_write on public.venture_key_results for all to authenticated
  using (public.can_edit_venture((select o.venture_id from public.venture_objectives o where o.id = objective_id)))
  with check (public.can_edit_venture((select o.venture_id from public.venture_objectives o where o.id = objective_id)));

create policy venture_actions_select on public.venture_actions for select to authenticated
  using (public.can_view_venture(venture_id));
create policy venture_actions_write on public.venture_actions for all to authenticated
  using (public.can_edit_venture(venture_id)) with check (public.can_edit_venture(venture_id));

-- Anyone who can see the venture (incl. Neomentores) may comment; authors edit their own.
create policy venture_comments_select on public.venture_comments for select to authenticated
  using (public.can_view_venture(venture_id));
create policy venture_comments_insert on public.venture_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_view_venture(venture_id));
create policy venture_comments_update on public.venture_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy venture_comments_delete on public.venture_comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.has_permission('ventures.manage')));
