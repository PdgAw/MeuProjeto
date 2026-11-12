-- =============================================================================
-- NeoLevel · 0200 · Cohorts, Neoleaders, tracks, professional profiles
-- =============================================================================

create type public.cohort_status as enum ('planned', 'active', 'completed', 'archived');
create type public.enrollment_status as enum ('active', 'paused', 'completed', 'dropped', 'transferred');
create type public.neoleader_track as enum ('founder', 'successor', 'other');
create type public.checkpoint_status as enum ('not_started', 'in_progress', 'done');

-- Turmas (coortes) -------------------------------------------------------------
create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- "NeoLevel 2026.1"
  code text unique,
  year int,
  starts_on date,
  ends_on date,
  capacity int check (capacity is null or capacity > 0),
  status public.cohort_status not null default 'planned',
  coordinator_id uuid references public.profiles (id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger cohorts_updated_at before update on public.cohorts
  for each row execute function public.set_updated_at();

-- Matrículas ---------------------------------------------------------------------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete restrict,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  unique (user_id, cohort_id)
);
create index enrollments_cohort_idx on public.enrollments (cohort_id) where status = 'active';
create index enrollments_user_idx on public.enrollments (user_id);

-- Neoleader profile (trilha) -----------------------------------------------------
create table public.neoleader_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  track public.neoleader_track not null default 'founder',
  track_other_label text,                   -- "Outro perfil aprovado pela coordenação"
  track_approved_by uuid references public.profiles (id) on delete set null,
  headline text,
  goals text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (track <> 'other' or track_other_label is not null)
);
create trigger neoleader_profiles_updated_at before update on public.neoleader_profiles
  for each row execute function public.set_updated_at();

-- Empresa familiar (trilha Herdeiro / Sucessor). Sensitive: owner, mentors, management.
create table public.family_businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  company_name text not null,
  sector text,
  structure text,
  employees_range text,
  generation text,
  current_position text,
  future_position text,
  governance_notes text,
  management_notes text,
  professionalization_notes text,
  succession_notes text,
  strategic_plan_notes text,
  share_with_mentors boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger family_businesses_updated_at before update on public.family_businesses
  for each row execute function public.set_updated_at();

-- Configurable track checkpoints (ideia → escala / governança → sucessão) ---------
create table public.track_checkpoints (
  id uuid primary key default gen_random_uuid(),
  track public.neoleader_track not null,
  key text not null,
  title text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (track, key)
);

create table public.neoleader_checkpoints (
  user_id uuid not null references public.profiles (id) on delete cascade,
  checkpoint_id uuid not null references public.track_checkpoints (id) on delete cascade,
  status public.checkpoint_status not null default 'not_started',
  notes text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, checkpoint_id)
);
create trigger neoleader_checkpoints_updated_at before update on public.neoleader_checkpoints
  for each row execute function public.set_updated_at();

-- Professional profile for professores, convidados e Neomentores -----------------
create table public.professional_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text,
  company text,
  position text,
  specialties text[] not null default '{}',
  areas text[] not null default '{}',
  bio text,
  links jsonb not null default '[]'::jsonb,    -- [{label, url}]
  is_guest boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger professional_profiles_updated_at before update on public.professional_profiles
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Scope helpers. PL/pgSQL so they can reference tables created in later
-- migrations (subjects, mentoring); bodies are resolved at call time.
-- =============================================================================
create or replace function public.my_cohort_ids(p_user uuid default auth.uid())
returns setof uuid language sql stable security definer set search_path = '' as $$
  select cohort_id from public.enrollments where user_id = p_user and status = 'active'
$$;

create or replace function public.is_cohort_member(p_cohort uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments
                 where cohort_id = p_cohort and user_id = p_user and status in ('active', 'completed'))
$$;

-- Teacher of any subject offered to one of the student's cohorts.
create or replace function public.teaches_student(p_student uuid, p_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return exists (
    select 1
    from public.subject_teachers st
    join public.subject_cohorts sc on sc.subject_id = st.subject_id
    join public.enrollments e on e.cohort_id = sc.cohort_id
    where st.user_id = p_user and e.user_id = p_student and e.status in ('active', 'completed')
  ) or exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.cohort_id = l.cohort_id
    where l.teacher_id = p_user and e.user_id = p_student
  );
end $$;

-- Active Neomentor of the student.
create or replace function public.mentors_student(p_student uuid, p_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return exists (
    select 1 from public.mentor_assignments ma
    where ma.mentor_id = p_user and ma.student_id = p_student and ma.is_active
  );
end $$;

-- Single entry point for "may the caller see this Neoleader's academic data?"
create or replace function public.can_view_student(p_student uuid, p_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user is null then return false; end if;
  return p_student = p_user
      or public.has_permission('students.view', p_user)
      or public.mentors_student(p_student, p_user)
      or public.teaches_student(p_student, p_user);
end $$;

-- Track changes require coordination (students.edit).
create or replace function public.guard_neoleader_track()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.has_permission('students.edit')
     and (new.track is distinct from old.track or new.track_other_label is distinct from old.track_other_label
          or new.track_approved_by is distinct from old.track_approved_by) then
    raise exception 'A trilha do Neoleader é definida pela coordenação.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger neoleader_profiles_guard before update on public.neoleader_profiles
  for each row execute function public.guard_neoleader_track();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.cohorts enable row level security;
alter table public.enrollments enable row level security;
alter table public.neoleader_profiles enable row level security;
alter table public.family_businesses enable row level security;
alter table public.track_checkpoints enable row level security;
alter table public.neoleader_checkpoints enable row level security;
alter table public.professional_profiles enable row level security;

create policy cohorts_select on public.cohorts for select to authenticated using (true);
create policy cohorts_insert on public.cohorts for insert to authenticated
  with check ((select public.has_permission('classes.create')));
create policy cohorts_update on public.cohorts for update to authenticated
  using ((select public.has_permission('classes.edit'))) with check ((select public.has_permission('classes.edit')));
create policy cohorts_delete on public.cohorts for delete to authenticated
  using ((select public.has_permission('classes.edit')));

create policy enrollments_select on public.enrollments for select to authenticated
  using (user_id = (select auth.uid()) or public.can_view_student(user_id)
         or (select public.has_permission('classes.view')));
create policy enrollments_write on public.enrollments for all to authenticated
  using ((select public.has_permission('students.edit')))
  with check ((select public.has_permission('students.edit')));

create policy neoleader_profiles_select on public.neoleader_profiles for select to authenticated
  using (public.can_view_student(user_id));
create policy neoleader_profiles_insert on public.neoleader_profiles for insert to authenticated
  with check ((select public.has_permission('students.edit')));
create policy neoleader_profiles_update on public.neoleader_profiles for update to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('students.edit')))
  with check (user_id = (select auth.uid()) or (select public.has_permission('students.edit')));

-- Family business: owner, management, and active mentors when the owner allows it.
create policy family_businesses_select on public.family_businesses for select to authenticated
  using (owner_id = (select auth.uid())
         or (select public.has_permission('students.view'))
         or (share_with_mentors and public.mentors_student(owner_id)));
create policy family_businesses_write on public.family_businesses for all to authenticated
  using (owner_id = (select auth.uid()) or (select public.has_permission('students.edit')))
  with check (owner_id = (select auth.uid()) or (select public.has_permission('students.edit')));

create policy track_checkpoints_select on public.track_checkpoints for select to authenticated using (true);
create policy track_checkpoints_write on public.track_checkpoints for all to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));

create policy neoleader_checkpoints_select on public.neoleader_checkpoints for select to authenticated
  using (public.can_view_student(user_id));
create policy neoleader_checkpoints_write on public.neoleader_checkpoints for all to authenticated
  using (user_id = (select auth.uid()) or public.mentors_student(user_id)
         or (select public.has_permission('students.edit')))
  with check (user_id = (select auth.uid()) or public.mentors_student(user_id)
              or (select public.has_permission('students.edit')));

create policy professional_profiles_select on public.professional_profiles for select to authenticated using (true);
create policy professional_profiles_write on public.professional_profiles for all to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.edit')))
  with check (user_id = (select auth.uid()) or (select public.has_permission('users.edit')));
