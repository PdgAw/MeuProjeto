-- =============================================================================
-- NeoLevel · 0100 · Identity & RBAC
-- Profiles, roles, granular permissions, per-user grants/revokes and the
-- authorization helpers used by every RLS policy in the platform.
-- =============================================================================


-- Generic updated_at trigger ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Enums ------------------------------------------------------------------------
create type public.user_status as enum ('invited', 'active', 'inactive', 'suspended', 'alumni');
create type public.permission_effect as enum ('grant', 'revoke');

-- Profiles: the public "card" of every person (safe for any signed-in user) ------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  preferred_name text,
  avatar_url text,
  job_title text,
  company text,
  status public.user_status not null default 'invited',
  must_change_password boolean not null default false,
  onboarded_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Public identity card. Contact data lives in profile_private; rich bio/privacy in profile_details.';
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Private contact data: never exposed to peers automatically ------------------
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text,
  phone text,
  birth_date date,
  document_number text,
  address jsonb,
  emergency_contact jsonb,
  updated_at timestamptz not null default now()
);
create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();

-- Rich profile + privacy preferences (Comunidade Neo) ---------------------------
create table public.profile_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bio text,
  city text,
  linkedin_url text,
  website_url text,
  interests text[] not null default '{}',
  competencies text[] not null default '{}',
  sectors text[] not null default '{}',
  -- Each flag controls whether that field appears in the community directory.
  privacy jsonb not null default jsonb_build_object(
    'directory', true, 'city', true, 'bio', true, 'linkedin', true,
    'interests', true, 'competencies', true, 'venture', false, 'cohort', true
  ),
  updated_at timestamptz not null default now()
);
create trigger profile_details_updated_at before update on public.profile_details
  for each row execute function public.set_updated_at();

-- Roles ("cargos") -------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text,
  -- Which dashboard the user lands on after login when this is their primary role.
  dashboard text not null default 'neoleader'
    check (dashboard in ('neoleader', 'coordination', 'direction', 'teacher', 'mentor', 'secretary', 'staff')),
  -- Lower = higher precedence when a user holds several roles.
  priority int not null default 100,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  module text not null,
  description text not null
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
create index user_roles_role_idx on public.user_roles (role_id);

-- Individual overrides: grant an extra permission or revoke one from the role.
create table public.user_permissions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  effect public.permission_effect not null default 'grant',
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

-- =============================================================================
-- Authorization helpers (SECURITY DEFINER so they can read RBAC tables even
-- when the caller cannot; STABLE so Postgres caches them per statement).
-- In policies always call them as (select public.fn(...)) to evaluate once.
-- =============================================================================
create or replace function public.has_role(p_role_key text, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user and r.key = p_role_key
  )
$$;

create or replace function public.is_super_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('super_admin', p_user)
$$;

create or replace function public.is_active_user(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = p_user and p.status in ('active', 'invited'))
$$;

create or replace function public.has_permission(p_permission text, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_user is null then false
    when not public.is_active_user(p_user) then false
    when public.is_super_admin(p_user) then true
    when exists (select 1 from public.user_permissions up
                 where up.user_id = p_user and up.permission_key = p_permission and up.effect = 'revoke') then false
    when exists (select 1 from public.user_permissions up
                 where up.user_id = p_user and up.permission_key = p_permission and up.effect = 'grant') then true
    else exists (
      select 1 from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = p_user and rp.permission_key = p_permission
    )
  end
$$;

-- Effective permission list for the signed-in user (used by the frontend).
create or replace function public.my_permissions()
returns setof text language sql stable security definer set search_path = '' as $$
  select p.key from public.permissions p
  where public.has_permission(p.key, auth.uid())
  order by p.key
$$;

-- =============================================================================
-- New auth user → profile rows. Role comes from app_metadata, which only the
-- service role (Edge Function / dashboard) can write — never from user input.
-- =============================================================================
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role_key text := new.raw_app_meta_data ->> 'role_key';
begin
  insert into public.profiles (id, full_name, status, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    'invited',
    coalesce((new.raw_app_meta_data ->> 'must_change_password')::boolean, true)
  );
  insert into public.profile_private (user_id, email) values (new.id, new.email);
  insert into public.profile_details (user_id) values (new.id);

  if v_role_key is not null then
    insert into public.user_roles (user_id, role_id)
    select new.id, r.id from public.roles r where r.key = v_role_key;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep profile_private.email in sync when the auth email changes.
create or replace function public.handle_auth_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profile_private set email = new.email where user_id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_auth_email_change();

-- =============================================================================
-- Guards: users may edit their own card, but not their status or force-reset flag.
-- =============================================================================
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Service role / migrations run without a JWT: allow. Trusted internal functions
  -- (e.g. complete_first_access) set a transaction-local flag that the API cannot set.
  if auth.uid() is null or public.has_permission('users.edit')
     or current_setting('neolevel.trusted_update', true) = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status then
    raise exception 'Somente a gestão pode alterar o status do usuário.' using errcode = '42501';
  end if;
  -- A user may clear their own must_change_password (after changing it), never set it.
  if new.must_change_password and not old.must_change_password then
    raise exception 'Operação não permitida.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Privilege escalation guard: only a super admin can hand out super_admin or
-- permissions.manage, and nobody edits their own roles.
create or replace function public.guard_role_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_target uuid := coalesce(new.user_id, old.user_id);
  v_role_key text;
begin
  if auth.uid() is null or public.is_super_admin() then
    return coalesce(new, old);
  end if;
  if v_target = auth.uid() then
    raise exception 'Você não pode alterar os próprios cargos ou permissões.' using errcode = '42501';
  end if;
  if tg_table_name = 'user_roles' then
    select key into v_role_key from public.roles where id = coalesce(new.role_id, old.role_id);
    if v_role_key = 'super_admin' then
      raise exception 'Somente Super Administradores podem conceder este cargo.' using errcode = '42501';
    end if;
  elsif coalesce(new.permission_key, old.permission_key) = 'permissions.manage' then
    raise exception 'Somente Super Administradores podem conceder esta permissão.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

create trigger user_roles_guard before insert or update or delete on public.user_roles
  for each row execute function public.guard_role_assignment();
create trigger user_permissions_guard before insert or update or delete on public.user_permissions
  for each row execute function public.guard_role_assignment();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.profile_details enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_permissions enable row level security;

-- Profile cards are visible to any signed-in member of the school.
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.has_permission('users.edit')))
  with check (id = (select auth.uid()) or (select public.has_permission('users.edit')));
create policy profiles_delete on public.profiles for delete to authenticated
  using ((select public.has_permission('users.delete')));
-- Inserts happen only through the auth trigger / service role.

create policy profile_private_select on public.profile_private for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.view')));
create policy profile_private_update on public.profile_private for update to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.edit')))
  with check (user_id = (select auth.uid()) or (select public.has_permission('users.edit')));

-- Rich details: owner and management only. Peers see them through
-- community_directory, which applies the owner's privacy flags.
create policy profile_details_select on public.profile_details for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.view'))
         or (select public.has_permission('students.view')));
create policy profile_details_update on public.profile_details for update to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.edit')))
  with check (user_id = (select auth.uid()) or (select public.has_permission('users.edit')));

create policy roles_select on public.roles for select to authenticated using (true);
create policy roles_write on public.roles for all to authenticated
  using ((select public.has_permission('permissions.manage')) and not is_system)
  with check ((select public.has_permission('permissions.manage')) and not is_system);

create policy permissions_select on public.permissions for select to authenticated using (true);

create policy role_permissions_select on public.role_permissions for select to authenticated using (true);
create policy role_permissions_write on public.role_permissions for all to authenticated
  using ((select public.has_permission('permissions.manage')))
  with check ((select public.has_permission('permissions.manage')));

create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.view')));
create policy user_roles_write on public.user_roles for all to authenticated
  using ((select public.has_permission('permissions.manage')))
  with check ((select public.has_permission('permissions.manage')));

create policy user_permissions_select on public.user_permissions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.view')));
create policy user_permissions_write on public.user_permissions for all to authenticated
  using ((select public.has_permission('permissions.manage')))
  with check ((select public.has_permission('permissions.manage')));
