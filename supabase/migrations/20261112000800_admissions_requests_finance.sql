-- =============================================================================
-- NeoLevel · 0800 · Admissões, Solicitações, Financeiro Acadêmico
-- =============================================================================

-- ------------------------------------------------------------- Admissões -------
create type public.admission_status as enum
  ('new_lead', 'application_received', 'screening', 'interview', 'committee',
   'approved', 'waitlist', 'rejected', 'enrolled');
create type public.interview_recommendation as enum ('advance', 'hold', 'reject');
create type public.committee_decision as enum ('approve', 'waitlist', 'reject');

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  city text,
  profile_type public.neoleader_track,
  goals text,
  experience text,
  company text,
  entrepreneurial_stage text,
  lead_source text,
  notes text,
  status public.admission_status not null default 'new_lead',
  target_cohort_id uuid references public.cohorts (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete set null,   -- responsible staff
  converted_user_id uuid references public.profiles (id) on delete set null,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index candidates_status_idx on public.candidates (status);
create unique index candidates_email_idx on public.candidates (lower(email)) where email is not null;
create trigger candidates_updated_at before update on public.candidates
  for each row execute function public.set_updated_at();

create table public.candidate_status_history (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  from_status public.admission_status,
  to_status public.admission_status not null,
  note text,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create or replace function public.track_candidate_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.candidate_status_history (candidate_id, from_status, to_status, changed_by)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger candidates_status_history after insert or update of status on public.candidates
  for each row execute function public.track_candidate_status();

-- "Entrevista de alinhamento" with configurable fields
create table public.interview_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- [{key, label, type: text|textarea|scale|select|boolean, options?, required?}]
  fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.candidate_interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  template_id uuid references public.interview_templates (id) on delete set null,
  interviewer_id uuid references public.profiles (id) on delete set null,
  scheduled_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  summary text,
  recommendation public.interview_recommendation,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- "Avaliação do Comitê" — restricted to committee members
create table public.committee_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  score numeric(4,1) check (score between 0 and 10),
  decision public.committee_decision not null,
  comment text,
  created_at timestamptz not null default now(),
  unique (candidate_id, reviewer_id)
);

-- Called by the invite Edge Function right after it creates the auth user, so the
-- candidate becomes a Neoleader (profile + track + enrollment) without retyping data.
create or replace function public.convert_candidate_to_neoleader(p_candidate uuid, p_user uuid, p_cohort uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_c public.candidates;
  v_cohort uuid;
begin
  if auth.uid() is not null and not public.has_permission('admissions.manage') then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select * into v_c from public.candidates where id = p_candidate for update;
  if not found then raise exception 'Candidato não encontrado.'; end if;
  if v_c.status not in ('approved', 'waitlist') then raise exception 'Candidato ainda não aprovado.'; end if;
  if v_c.converted_user_id is not null then raise exception 'Candidato já convertido.'; end if;
  v_cohort := coalesce(p_cohort, v_c.target_cohort_id);
  if v_cohort is null then raise exception 'Informe a turma de matrícula.'; end if;

  update public.profiles set full_name = v_c.full_name where id = p_user;
  update public.profile_private set phone = coalesce(phone, v_c.phone), birth_date = coalesce(birth_date, v_c.birth_date)
   where user_id = p_user;
  update public.profile_details set city = coalesce(city, v_c.city) where user_id = p_user;

  insert into public.user_roles (user_id, role_id)
  select p_user, r.id from public.roles r where r.key = 'neoleader'
  on conflict do nothing;

  insert into public.neoleader_profiles (user_id, track, goals)
  values (p_user, coalesce(v_c.profile_type, 'founder'), v_c.goals)
  on conflict (user_id) do update set goals = coalesce(public.neoleader_profiles.goals, excluded.goals);

  if v_c.profile_type = 'successor' and v_c.company is not null then
    insert into public.family_businesses (owner_id, company_name) values (p_user, v_c.company)
    on conflict (owner_id) do nothing;
  end if;

  insert into public.enrollments (user_id, cohort_id) values (p_user, v_cohort)
  on conflict (user_id, cohort_id) do nothing;

  update public.candidates
     set status = 'enrolled', converted_user_id = p_user, converted_at = now(), target_cohort_id = v_cohort
   where id = p_candidate;
end $$;

alter table public.candidates enable row level security;
alter table public.candidate_status_history enable row level security;
alter table public.interview_templates enable row level security;
alter table public.candidate_interviews enable row level security;
alter table public.committee_reviews enable row level security;

create policy candidates_select on public.candidates for select to authenticated
  using ((select public.has_permission('admissions.view')) or (select public.has_permission('admissions.committee')));
create policy candidates_write on public.candidates for all to authenticated
  using ((select public.has_permission('admissions.manage'))) with check ((select public.has_permission('admissions.manage')));
create policy candidate_history_select on public.candidate_status_history for select to authenticated
  using ((select public.has_permission('admissions.view')));
create policy interview_templates_select on public.interview_templates for select to authenticated
  using ((select public.has_permission('admissions.view')));
create policy interview_templates_write on public.interview_templates for all to authenticated
  using ((select public.has_permission('admissions.manage'))) with check ((select public.has_permission('admissions.manage')));
create policy interviews_select on public.candidate_interviews for select to authenticated
  using ((select public.has_permission('admissions.view')) or (select public.has_permission('admissions.committee')));
create policy interviews_write on public.candidate_interviews for all to authenticated
  using ((select public.has_permission('admissions.manage')) or interviewer_id = (select auth.uid()))
  with check ((select public.has_permission('admissions.manage')) or interviewer_id = (select auth.uid()));
create policy committee_select on public.committee_reviews for select to authenticated
  using ((select public.has_permission('admissions.committee')));
create policy committee_write on public.committee_reviews for all to authenticated
  using (reviewer_id = (select auth.uid()) and (select public.has_permission('admissions.committee')))
  with check (reviewer_id = (select auth.uid()) and (select public.has_permission('admissions.committee')));

-- ----------------------------------------------------------- Solicitações -------
create type public.request_type as enum ('document', 'declaration', 'profile_change', 'support', 'academic_issue', 'other');
create type public.request_status as enum ('open', 'in_review', 'awaiting_user', 'resolved', 'canceled');

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  type public.request_type not null,
  subject text not null,
  description text,
  status public.request_status not null default 'open',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  assigned_to uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_requests_status_idx on public.service_requests (status, created_at desc);
create trigger service_requests_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();

create table public.service_request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  is_internal boolean not null default false,     -- staff-only note
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Requesters can only cancel (or reopen from awaiting_user); staff handles the rest.
create or replace function public.guard_service_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.has_permission('requests.manage') then
    if new.status = 'resolved' and old.status <> 'resolved' then new.resolved_at := now(); end if;
    return new;
  end if;
  if new.assigned_to is distinct from old.assigned_to or new.priority is distinct from old.priority
     or new.type is distinct from old.type or new.requester_id <> old.requester_id
     or (new.status is distinct from old.status
         and not (new.status = 'canceled' or (old.status = 'awaiting_user' and new.status = 'in_review'))) then
    raise exception 'Operação não permitida.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger service_requests_guard before update on public.service_requests
  for each row execute function public.guard_service_request();

alter table public.service_requests enable row level security;
alter table public.service_request_comments enable row level security;

create policy requests_select on public.service_requests for select to authenticated
  using (requester_id = (select auth.uid()) or assigned_to = (select auth.uid())
         or (select public.has_permission('requests.manage')));
create policy requests_insert on public.service_requests for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'open' and assigned_to is null);
create policy requests_update on public.service_requests for update to authenticated
  using (requester_id = (select auth.uid()) or (select public.has_permission('requests.manage')))
  with check (requester_id = (select auth.uid()) or (select public.has_permission('requests.manage')));

create policy request_comments_select on public.service_request_comments for select to authenticated
  using ((select public.has_permission('requests.manage'))
         or (not is_internal and exists (select 1 from public.service_requests r
                                         where r.id = request_id and r.requester_id = (select auth.uid()))));
create policy request_comments_insert on public.service_request_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and (
    (select public.has_permission('requests.manage'))
    or (not is_internal and exists (select 1 from public.service_requests r
                                    where r.id = request_id and r.requester_id = (select auth.uid())))));

-- ---------------------------------------------------- Financeiro Acadêmico -------
-- Structure only: no payment gateway in this first version.
create type public.agreement_status as enum ('active', 'completed', 'canceled', 'defaulted');
create type public.adjustment_kind as enum ('scholarship', 'discount');
create type public.installment_status as enum ('pending', 'paid', 'overdue', 'canceled', 'waived');

create table public.financial_agreements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  cohort_id uuid references public.cohorts (id) on delete set null,
  contract_document_id uuid references public.documents (id) on delete set null,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  installments_count int not null default 1 check (installments_count > 0),
  start_date date not null,
  status public.agreement_status not null default 'active',
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger financial_agreements_updated_at before update on public.financial_agreements
  for each row execute function public.set_updated_at();

create table public.financial_adjustments (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.financial_agreements (id) on delete cascade,
  kind public.adjustment_kind not null,
  percent numeric(5,2) check (percent between 0 and 100),
  amount numeric(12,2) check (amount >= 0),
  reason text,
  valid_from date,
  valid_to date,
  approved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (percent is not null or amount is not null)
);

create table public.tuition_installments (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.financial_agreements (id) on delete cascade,
  number int not null,
  due_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  status public.installment_status not null default 'pending',
  paid_at timestamptz,
  payment_method text,
  reference text,
  unique (agreement_id, number)
);
create index tuition_installments_due_idx on public.tuition_installments (due_date) where status in ('pending', 'overdue');

alter table public.financial_agreements enable row level security;
alter table public.financial_adjustments enable row level security;
alter table public.tuition_installments enable row level security;

create policy agreements_select on public.financial_agreements for select to authenticated
  using (student_id = (select auth.uid()) or (select public.has_permission('finance.view')));
create policy agreements_write on public.financial_agreements for all to authenticated
  using ((select public.has_permission('finance.manage'))) with check ((select public.has_permission('finance.manage')));
create policy adjustments_select on public.financial_adjustments for select to authenticated
  using ((select public.has_permission('finance.view')) or exists (
    select 1 from public.financial_agreements a where a.id = agreement_id and a.student_id = (select auth.uid())));
create policy adjustments_write on public.financial_adjustments for all to authenticated
  using ((select public.has_permission('finance.manage'))) with check ((select public.has_permission('finance.manage')));
create policy installments_select on public.tuition_installments for select to authenticated
  using ((select public.has_permission('finance.view')) or exists (
    select 1 from public.financial_agreements a where a.id = agreement_id and a.student_id = (select auth.uid())));
create policy installments_write on public.tuition_installments for all to authenticated
  using ((select public.has_permission('finance.manage'))) with check ((select public.has_permission('finance.manage')));
