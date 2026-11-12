-- =============================================================================
-- NeoLevel · 0600 · Bancas & VC, Experiências Neo, Comunidade Neo
-- =============================================================================

-- ---------------------------------------------------------------- Bancas ------
create type public.panel_round_status as enum ('draft', 'open', 'reviewing', 'closed');
create type public.pitch_status as enum
  ('draft', 'eligible', 'submitted', 'in_review', 'panel_scheduled', 'evaluated', 'selected', 'not_selected');

create table public.panel_rounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,                           -- "Banca NeoLevel 2026.2"
  description text,
  status public.panel_round_status not null default 'draft',
  submissions_open_at timestamptz,
  submissions_close_at timestamptz,
  panel_date timestamptz,
  location text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger panel_rounds_updated_at before update on public.panel_rounds
  for each row execute function public.set_updated_at();

-- Criteria are configured per round by coordination — never fixed in code.
create table public.panel_criteria (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.panel_rounds (id) on delete cascade,
  name text not null,
  description text,
  weight numeric(5,2) not null default 1 check (weight > 0),
  max_score numeric(5,2) not null default 10 check (max_score > 0),
  sort_order int not null default 0
);

create table public.panel_evaluators (
  round_id uuid not null references public.panel_rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (round_id, user_id)
);

create table public.pitch_submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.panel_rounds (id) on delete restrict,
  venture_id uuid not null references public.ventures (id) on delete cascade,
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  status public.pitch_status not null default 'draft',
  problem text,
  solution text,
  market text,
  business_model text,
  traction text,
  strategy text,
  team text,
  capital_needed numeric(14,2),
  capital_use text,
  pitch_deck_path text,
  panel_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, venture_id)
);
create trigger pitch_submissions_updated_at before update on public.pitch_submissions
  for each row execute function public.set_updated_at();

-- Confidential results: final decision notes live apart from the submission.
create table public.pitch_decisions (
  submission_id uuid primary key references public.pitch_submissions (id) on delete cascade,
  decision_notes text,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz not null default now()
);

create table public.pitch_evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.pitch_submissions (id) on delete cascade,
  evaluator_id uuid not null references public.profiles (id) on delete cascade,
  general_comment text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (submission_id, evaluator_id)
);

create table public.pitch_scores (
  evaluation_id uuid not null references public.pitch_evaluations (id) on delete cascade,
  criterion_id uuid not null references public.panel_criteria (id) on delete cascade,
  score numeric(5,2) not null check (score >= 0),
  comment text,
  primary key (evaluation_id, criterion_id)
);

create or replace function public.is_panel_evaluator(p_round uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.panel_evaluators where round_id = p_round and user_id = p_user)
$$;

-- Neoleaders may only move their pitch between draft/eligible and submitted.
create or replace function public.guard_pitch_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.has_permission('panels.manage') then return new; end if;
  if tg_op = 'INSERT' and new.status not in ('draft', 'submitted') then
    raise exception 'Status inicial inválido.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if old.status not in ('draft', 'eligible') then
      raise exception 'Pitch já submetido; alterações só pela coordenação.' using errcode = '42501';
    end if;
    if new.status not in ('draft', 'eligible', 'submitted') or new.panel_at is distinct from old.panel_at then
      raise exception 'Operação não permitida.' using errcode = '42501';
    end if;
  end if;
  if new.status = 'submitted' then new.submitted_at := now(); end if;
  return new;
end $$;
create trigger pitch_submissions_guard before insert or update on public.pitch_submissions
  for each row execute function public.guard_pitch_submission();

-- Score must not exceed the criterion maximum.
create or replace function public.check_pitch_score()
returns trigger language plpgsql set search_path = '' as $$
declare v_max numeric;
begin
  select max_score into v_max from public.panel_criteria where id = new.criterion_id;
  if new.score > v_max then raise exception 'Nota acima do máximo do critério (%).', v_max; end if;
  return new;
end $$;
create trigger pitch_scores_check before insert or update on public.pitch_scores
  for each row execute function public.check_pitch_score();

-- Weighted average per submission (0–10 scale), only for authorized viewers.
create or replace function public.pitch_results(p_round uuid)
returns table (submission_id uuid, venture_id uuid, venture_name text, evaluations int, weighted_score numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('panels.results') then
    raise exception 'Resultado confidencial.' using errcode = '42501';
  end if;
  return query
  select s.id, v.id, v.name,
         count(distinct e.id)::int,
         round(sum(ps.score / c.max_score * 10 * c.weight) / nullif(sum(c.weight), 0), 2)
  from public.pitch_submissions s
  join public.ventures v on v.id = s.venture_id
  left join public.pitch_evaluations e on e.submission_id = s.id and e.submitted_at is not null
  left join public.pitch_scores ps on ps.evaluation_id = e.id
  left join public.panel_criteria c on c.id = ps.criterion_id
  where s.round_id = p_round
  group by s.id, v.id, v.name
  order by 5 desc nulls last;
end $$;

alter table public.panel_rounds enable row level security;
alter table public.panel_criteria enable row level security;
alter table public.panel_evaluators enable row level security;
alter table public.pitch_submissions enable row level security;
alter table public.pitch_decisions enable row level security;
alter table public.pitch_evaluations enable row level security;
alter table public.pitch_scores enable row level security;

create policy panel_rounds_select on public.panel_rounds for select to authenticated
  using (status <> 'draft' or (select public.has_permission('panels.manage')));
create policy panel_rounds_write on public.panel_rounds for all to authenticated
  using ((select public.has_permission('panels.manage'))) with check ((select public.has_permission('panels.manage')));

create policy panel_criteria_select on public.panel_criteria for select to authenticated using (true);
create policy panel_criteria_write on public.panel_criteria for all to authenticated
  using ((select public.has_permission('panels.manage'))) with check ((select public.has_permission('panels.manage')));

create policy panel_evaluators_select on public.panel_evaluators for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('panels.manage')));
create policy panel_evaluators_write on public.panel_evaluators for all to authenticated
  using ((select public.has_permission('panels.manage'))) with check ((select public.has_permission('panels.manage')));

create policy pitch_submissions_select on public.pitch_submissions for select to authenticated
  using (public.is_venture_member(venture_id) or public.is_panel_evaluator(round_id)
         or (select public.has_permission('panels.manage')) or (select public.has_permission('panels.results')));
create policy pitch_submissions_insert on public.pitch_submissions for insert to authenticated
  with check ((submitted_by = (select auth.uid()) and public.is_venture_member(venture_id))
              or (select public.has_permission('panels.manage')));
create policy pitch_submissions_update on public.pitch_submissions for update to authenticated
  using (public.is_venture_member(venture_id) or (select public.has_permission('panels.manage')))
  with check (public.is_venture_member(venture_id) or (select public.has_permission('panels.manage')));

create policy pitch_decisions_select on public.pitch_decisions for select to authenticated
  using ((select public.has_permission('panels.results')));
create policy pitch_decisions_write on public.pitch_decisions for all to authenticated
  using ((select public.has_permission('panels.manage'))) with check ((select public.has_permission('panels.manage')));

-- Evaluators see their own evaluation; results viewers see all. Neoleaders never see scores.
create policy pitch_evaluations_select on public.pitch_evaluations for select to authenticated
  using (evaluator_id = (select auth.uid()) or (select public.has_permission('panels.results')));
create policy pitch_evaluations_write on public.pitch_evaluations for all to authenticated
  using (evaluator_id = (select auth.uid()))
  with check (evaluator_id = (select auth.uid())
              and public.is_panel_evaluator((select s.round_id from public.pitch_submissions s where s.id = submission_id)));

create policy pitch_scores_select on public.pitch_scores for select to authenticated
  using (exists (select 1 from public.pitch_evaluations e where e.id = evaluation_id
                 and (e.evaluator_id = (select auth.uid()) or (select public.has_permission('panels.results')))));
create policy pitch_scores_write on public.pitch_scores for all to authenticated
  using (exists (select 1 from public.pitch_evaluations e where e.id = evaluation_id and e.evaluator_id = (select auth.uid())))
  with check (exists (select 1 from public.pitch_evaluations e where e.id = evaluation_id and e.evaluator_id = (select auth.uid())));

-- ------------------------------------------------------- Experiências Neo ----
create type public.experience_category as enum
  ('neomeeting', 'conexao_neo', 'company_visit', 'workshop', 'mission', 'event', 'meetup', 'international', 'other');
create type public.experience_status as enum ('draft', 'published', 'canceled', 'completed');
create type public.registration_status as enum ('confirmed', 'waitlist', 'canceled', 'attended', 'no_show');

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  category public.experience_category not null,
  title text not null,
  description text,
  cover_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  capacity int check (capacity is null or capacity > 0),
  owner_id uuid references public.profiles (id) on delete set null,
  guests text,
  companies text[] not null default '{}',
  cohort_id uuid references public.cohorts (id) on delete cascade,   -- null = all Neoleaders
  registration_open boolean not null default true,
  registration_deadline timestamptz,
  is_educational boolean not null default true,
  status public.experience_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index experiences_starts_idx on public.experiences (starts_at) where status = 'published';
create trigger experiences_updated_at before update on public.experiences
  for each row execute function public.set_updated_at();

create table public.experience_registrations (
  experience_id uuid not null references public.experiences (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.registration_status not null default 'confirmed',
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,
  primary key (experience_id, user_id)
);
create index experience_registrations_user_idx on public.experience_registrations (user_id);

-- "Meu principal aprendizado" / "O que aplicarei no meu negócio?" + feedback
create table public.experience_reflections (
  experience_id uuid not null references public.experiences (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  main_learning text,
  application text,
  rating int check (rating between 1 and 5),
  feedback text,
  created_at timestamptz not null default now(),
  primary key (experience_id, user_id)
);

-- Post-event photos/materials/insights
create table public.experience_media (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  kind text not null default 'photo' check (kind in ('photo', 'material', 'insight', 'link')),
  title text,
  url text,
  storage_path text,
  body text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.can_see_experience(p_experience uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.experiences x where x.id = p_experience
      and (public.has_permission('events.manage', p_user) or x.owner_id = p_user
           or (x.status <> 'draft' and (x.cohort_id is null or public.is_cohort_member(x.cohort_id, p_user)
                                        or not exists (select 1 from public.enrollments e where e.user_id = p_user))))
  )
$$;

-- Register: confirmed while there is room, otherwise waitlist.
create or replace function public.register_for_experience(p_experience uuid)
returns public.experience_registrations language plpgsql security definer set search_path = '' as $$
declare
  v_x public.experiences;
  v_taken int;
  v_row public.experience_registrations;
begin
  select * into v_x from public.experiences where id = p_experience for update;
  if not found or not public.can_see_experience(p_experience) then raise exception 'Experiência não encontrada.'; end if;
  if v_x.status <> 'published' or not v_x.registration_open
     or (v_x.registration_deadline is not null and now() > v_x.registration_deadline) then
    raise exception 'Inscrições encerradas.';
  end if;
  select count(*) into v_taken from public.experience_registrations
   where experience_id = p_experience and status in ('confirmed', 'attended');
  insert into public.experience_registrations (experience_id, user_id, status)
  values (p_experience, auth.uid(),
          case when v_x.capacity is null or v_taken < v_x.capacity then 'confirmed' else 'waitlist' end::public.registration_status)
  on conflict (experience_id, user_id) do update
    set status = excluded.status, registered_at = now()
    where public.experience_registrations.status = 'canceled'
  returning * into v_row;
  if v_row is null then
    select * into v_row from public.experience_registrations where experience_id = p_experience and user_id = auth.uid();
  end if;
  return v_row;
end $$;

-- Cancel and promote the first person on the waitlist.
create or replace function public.cancel_experience_registration(p_experience uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_capacity int;
begin
  select capacity into v_capacity from public.experiences where id = p_experience for update;
  update public.experience_registrations set status = 'canceled'
   where experience_id = p_experience and user_id = auth.uid() and status in ('confirmed', 'waitlist');
  if not found then return; end if;
  if v_capacity is null or (select count(*) from public.experience_registrations
                            where experience_id = p_experience and status in ('confirmed', 'attended')) < v_capacity then
    update public.experience_registrations set status = 'confirmed'
     where (experience_id, user_id) = (
       select experience_id, user_id from public.experience_registrations
       where experience_id = p_experience and status = 'waitlist'
       order by registered_at limit 1);
  end if;
end $$;

alter table public.experiences enable row level security;
alter table public.experience_registrations enable row level security;
alter table public.experience_reflections enable row level security;
alter table public.experience_media enable row level security;

create policy experiences_select on public.experiences for select to authenticated using (public.can_see_experience(id));
create policy experiences_insert on public.experiences for insert to authenticated
  with check ((select public.has_permission('events.manage')));
create policy experiences_update on public.experiences for update to authenticated
  using ((select public.has_permission('events.manage')) or owner_id = (select auth.uid()))
  with check ((select public.has_permission('events.manage')) or owner_id = (select auth.uid()));
create policy experiences_delete on public.experiences for delete to authenticated
  using ((select public.has_permission('events.manage')));

create policy registrations_select on public.experience_registrations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('events.manage'))
         or public.can_view_student(user_id));
-- Neoleaders use register_for_experience(); management handles check-in and manual changes.
create policy registrations_write on public.experience_registrations for all to authenticated
  using ((select public.has_permission('events.manage'))) with check ((select public.has_permission('events.manage')));

create policy reflections_select on public.experience_reflections for select to authenticated
  using (user_id = (select auth.uid()) or public.can_view_student(user_id)
         or (select public.has_permission('events.manage')));
create policy reflections_write on public.experience_reflections for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.experience_registrations r
    where r.experience_id = experience_reflections.experience_id and r.user_id = (select auth.uid())
      and r.status in ('confirmed', 'attended')));

create policy experience_media_select on public.experience_media for select to authenticated
  using (public.can_see_experience(experience_id));
create policy experience_media_write on public.experience_media for all to authenticated
  using ((select public.has_permission('events.manage'))) with check ((select public.has_permission('events.manage')));

-- ---------------------------------------------------------- Comunidade Neo ----
create type public.connection_status as enum ('pending', 'accepted', 'declined');

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.connection_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index connections_pair_idx on public.connections
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.connections enable row level security;
create policy connections_select on public.connections for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
create policy connections_insert on public.connections for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');
create policy connections_update on public.connections for update to authenticated
  using (addressee_id = (select auth.uid())) with check (addressee_id = (select auth.uid()));
create policy connections_delete on public.connections for delete to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

-- Directory honoring each person's privacy flags. Contact data (email/phone) is
-- never part of it. SECURITY DEFINER on purpose: it reads private tables but
-- only returns the fields the owner chose to share.
create or replace function public.community_directory(
  p_search text default null,
  p_kind text default null,                -- 'neoleader' | 'mentor' | 'teacher'
  p_cohort uuid default null,
  p_stage public.venture_stage default null
)
returns table (
  user_id uuid, full_name text, avatar_url text, job_title text, company text, kind text,
  cohort_name text, city text, bio text, linkedin_url text, interests text[], competencies text[],
  sectors text[], specialties text[], venture_name text, venture_segment text, venture_stage public.venture_stage
)
language sql stable security definer set search_path = '' as $$
  with people as (
    select p.id, p.full_name, p.avatar_url, p.job_title, p.company, d.privacy, d.city, d.bio,
           d.linkedin_url, d.interests, d.competencies, d.sectors,
           case
             when public.has_role('neoleader', p.id) then 'neoleader'
             when public.has_role('mentor', p.id) then 'mentor'
             when public.has_role('teacher', p.id) then 'teacher'
             else 'staff'
           end as kind
    from public.profiles p
    join public.profile_details d on d.user_id = p.id
    where auth.uid() is not null
      and p.status = 'active'
      and coalesce((d.privacy ->> 'directory')::boolean, true)
  )
  select pe.id, pe.full_name, pe.avatar_url, pe.job_title, pe.company, pe.kind,
         case when coalesce((pe.privacy ->> 'cohort')::boolean, true) then c.name end,
         case when coalesce((pe.privacy ->> 'city')::boolean, true) then pe.city end,
         case when coalesce((pe.privacy ->> 'bio')::boolean, true) then coalesce(pe.bio, pp.bio) end,
         case when coalesce((pe.privacy ->> 'linkedin')::boolean, true) then pe.linkedin_url end,
         case when coalesce((pe.privacy ->> 'interests')::boolean, true) then pe.interests else '{}' end,
         case when coalesce((pe.privacy ->> 'competencies')::boolean, true) then pe.competencies else '{}' end,
         pe.sectors,
         coalesce(pp.specialties, '{}'),
         case when v.visibility = 'community' then v.name end,
         case when v.visibility = 'community' then v.segment end,
         case when v.visibility = 'community' then v.stage end
  from people pe
  left join public.professional_profiles pp on pp.user_id = pe.id
  left join lateral (
    select co.id, co.name from public.enrollments e join public.cohorts co on co.id = e.cohort_id
    where e.user_id = pe.id and e.status in ('active', 'completed') order by e.enrolled_at desc limit 1
  ) c on true
  left join public.ventures v on v.owner_id = pe.id and v.is_primary
  where pe.kind <> 'staff'
    and (p_kind is null or pe.kind = p_kind)
    and (p_cohort is null or c.id = p_cohort)
    and (p_stage is null or (v.visibility = 'community' and v.stage = p_stage))
    and (p_search is null or pe.full_name ilike '%' || p_search || '%'
         or pe.company ilike '%' || p_search || '%'
         or exists (select 1 from unnest(pe.interests || pe.sectors || coalesce(pp.specialties, '{}')) t
                    where t ilike '%' || p_search || '%'))
  order by pe.full_name
$$;
