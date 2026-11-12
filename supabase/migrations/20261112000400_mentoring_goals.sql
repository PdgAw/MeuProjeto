-- =============================================================================
-- NeoLevel · 0400 · Neomentoria & goals
-- =============================================================================

create type public.mentoring_status as enum ('requested', 'scheduled', 'completed', 'canceled', 'no_show');
create type public.action_item_status as enum ('open', 'done', 'canceled');
create type public.goal_status as enum ('not_started', 'in_progress', 'blocked', 'done', 'canceled');
create type public.goal_source as enum ('self', 'mentoring', 'coordination', 'venture');

-- Neomentor ↔ Neoleader links (one Neoleader may have several Neomentores)
create table public.mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  is_active boolean not null default true,
  focus text,
  started_on date not null default current_date,
  ended_on date,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (mentor_id, student_id),
  check (mentor_id <> student_id)
);
create index mentor_assignments_student_idx on public.mentor_assignments (student_id) where is_active;

create table public.mentoring_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_at timestamptz,
  duration_min int not null default 60 check (duration_min between 10 and 480),
  modality public.lesson_modality not null default 'online',
  location text,
  meeting_url text,
  topics text[] not null default '{}',
  status public.mentoring_status not null default 'scheduled',
  requested_by uuid references public.profiles (id) on delete set null,
  request_note text,
  -- Shared record (visible to the Neoleader)
  summary text,
  difficulties text,
  decisions text,
  shared_notes text,
  files jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  canceled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'requested' or scheduled_at is not null)
);
create index mentoring_sessions_student_idx on public.mentoring_sessions (student_id, scheduled_at desc);
create index mentoring_sessions_mentor_idx on public.mentoring_sessions (mentor_id, scheduled_at desc);
create trigger mentoring_sessions_updated_at before update on public.mentoring_sessions
  for each row execute function public.set_updated_at();

-- Private mentor notes: a separate table so no column-level leak is possible.
-- The Neoleader can NEVER read these rows (see policy below).
create table public.mentoring_private_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.mentoring_sessions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (author_id <> student_id)
);
create index mentoring_private_notes_student_idx on public.mentoring_private_notes (student_id);
create trigger mentoring_private_notes_updated_at before update on public.mentoring_private_notes
  for each row execute function public.set_updated_at();

-- Próximos passos generated when a session is completed
create table public.mentoring_action_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mentoring_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  due_date date,
  status public.action_item_status not null default 'open',
  completed_at timestamptz,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index mentoring_action_items_student_idx on public.mentoring_action_items (student_id, status);

-- Metas (personal, mentoring, coordination or venture goals)
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  source public.goal_source not null default 'self',
  session_id uuid references public.mentoring_sessions (id) on delete set null,
  title text not null,
  description text,
  dimension public.progress_dimension not null default 'goals',
  due_date date,
  status public.goal_status not null default 'not_started',
  progress int not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_owner_idx on public.goals (owner_id, status);
create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- Stamp completed_at automatically
create or replace function public.stamp_completed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status::text = 'done' and (tg_op = 'INSERT' or old.status::text <> 'done') then
    new.completed_at := now();
  elsif new.status::text <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;
create trigger goals_completed before insert or update of status on public.goals
  for each row execute function public.stamp_completed_at();
create trigger action_items_completed before insert or update of status on public.mentoring_action_items
  for each row execute function public.stamp_completed_at();

-- =============================================================================
-- RPCs
-- =============================================================================

-- Neoleader asks one of their Neomentores for a session.
create or replace function public.request_mentoring(
  p_mentor uuid, p_preferred_at timestamptz default null, p_topics text[] default '{}', p_note text default null
) returns public.mentoring_sessions language plpgsql security definer set search_path = '' as $$
declare v_row public.mentoring_sessions;
begin
  if not public.mentors_student(auth.uid(), p_mentor) then
    raise exception 'Este Neomentor não está vinculado a você.' using errcode = '42501';
  end if;
  insert into public.mentoring_sessions (mentor_id, student_id, scheduled_at, status, requested_by, request_note, topics)
  values (p_mentor, auth.uid(), p_preferred_at, 'requested', auth.uid(), p_note, coalesce(p_topics, '{}'))
  returning * into v_row;
  return v_row;
end $$;

-- Mentor closes a session: shared record + private note + next steps, atomically.
create or replace function public.complete_mentoring_session(
  p_session uuid,
  p_summary text,
  p_difficulties text default null,
  p_decisions text default null,
  p_next_steps text[] default '{}',
  p_due_in_days int default 14,
  p_private_note text default null
) returns public.mentoring_sessions language plpgsql security definer set search_path = '' as $$
declare
  v_row public.mentoring_sessions;
  v_step text;
  v_i int := 0;
begin
  select * into v_row from public.mentoring_sessions where id = p_session for update;
  if not found then raise exception 'Mentoria não encontrada.'; end if;
  if v_row.mentor_id <> auth.uid() and not public.has_permission('mentoring.manage') then
    raise exception 'Somente o Neomentor da sessão pode concluí-la.' using errcode = '42501';
  end if;
  if v_row.status in ('completed', 'canceled') then raise exception 'Esta mentoria já foi encerrada.'; end if;

  update public.mentoring_sessions
     set status = 'completed', completed_at = now(), summary = p_summary,
         difficulties = p_difficulties, decisions = p_decisions,
         scheduled_at = coalesce(scheduled_at, now())
   where id = p_session returning * into v_row;

  foreach v_step in array coalesce(p_next_steps, '{}') loop
    if btrim(v_step) <> '' then
      v_i := v_i + 1;
      insert into public.mentoring_action_items (session_id, student_id, title, due_date, sort_order, created_by)
      values (p_session, v_row.student_id, btrim(v_step), current_date + greatest(p_due_in_days, 0), v_i, auth.uid());
    end if;
  end loop;

  if nullif(btrim(p_private_note), '') is not null then
    insert into public.mentoring_private_notes (student_id, session_id, author_id, content)
    values (v_row.student_id, p_session, auth.uid(), p_private_note);
  end if;
  return v_row;
end $$;

-- Either party cancels an open session.
create or replace function public.cancel_mentoring_session(p_session uuid, p_reason text default null)
returns public.mentoring_sessions language plpgsql security definer set search_path = '' as $$
declare v_row public.mentoring_sessions;
begin
  update public.mentoring_sessions
     set status = 'canceled', canceled_reason = p_reason
   where id = p_session and status in ('requested', 'scheduled')
     and (student_id = auth.uid() or mentor_id = auth.uid() or public.has_permission('mentoring.manage'))
  returning * into v_row;
  if v_row is null then raise exception 'Mentoria não encontrada ou não pode ser cancelada.'; end if;
  return v_row;
end $$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.mentor_assignments enable row level security;
alter table public.mentoring_sessions enable row level security;
alter table public.mentoring_private_notes enable row level security;
alter table public.mentoring_action_items enable row level security;
alter table public.goals enable row level security;

create policy mentor_assignments_select on public.mentor_assignments for select to authenticated
  using (mentor_id = (select auth.uid()) or student_id = (select auth.uid())
         or (select public.has_permission('mentoring.view')));
create policy mentor_assignments_write on public.mentor_assignments for all to authenticated
  using ((select public.has_permission('mentoring.manage')))
  with check ((select public.has_permission('mentoring.manage')));

create policy mentoring_sessions_select on public.mentoring_sessions for select to authenticated
  using (student_id = (select auth.uid()) or mentor_id = (select auth.uid())
         or (select public.has_permission('mentoring.view')));
-- Mentors schedule with their own mentees; Neoleaders use request_mentoring().
create policy mentoring_sessions_insert on public.mentoring_sessions for insert to authenticated
  with check ((mentor_id = (select auth.uid()) and public.mentors_student(student_id))
              or (select public.has_permission('mentoring.manage')));
create policy mentoring_sessions_update on public.mentoring_sessions for update to authenticated
  using (mentor_id = (select auth.uid()) or (select public.has_permission('mentoring.manage')))
  with check (mentor_id = (select auth.uid()) or (select public.has_permission('mentoring.manage')));
create policy mentoring_sessions_delete on public.mentoring_sessions for delete to authenticated
  using ((select public.has_permission('mentoring.manage')));

-- Private notes: author, or mentoring managers — and never the Neoleader themself,
-- even if that person also holds a management permission.
create policy private_notes_select on public.mentoring_private_notes for select to authenticated
  using (student_id <> (select auth.uid())
         and (author_id = (select auth.uid()) or (select public.has_permission('mentoring.manage'))));
create policy private_notes_insert on public.mentoring_private_notes for insert to authenticated
  with check (author_id = (select auth.uid()) and student_id <> (select auth.uid())
              and (public.mentors_student(student_id) or (select public.has_permission('mentoring.manage'))));
create policy private_notes_update on public.mentoring_private_notes for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy private_notes_delete on public.mentoring_private_notes for delete to authenticated
  using (author_id = (select auth.uid()));

create policy action_items_select on public.mentoring_action_items for select to authenticated
  using (student_id = (select auth.uid()) or public.mentors_student(student_id)
         or (select public.has_permission('mentoring.view')));
create policy action_items_write on public.mentoring_action_items for all to authenticated
  using (student_id = (select auth.uid()) or public.mentors_student(student_id)
         or (select public.has_permission('mentoring.manage')))
  with check (student_id = (select auth.uid()) or public.mentors_student(student_id)
              or (select public.has_permission('mentoring.manage')));

create policy goals_select on public.goals for select to authenticated
  using (owner_id = (select auth.uid()) or public.can_view_student(owner_id));
create policy goals_write on public.goals for all to authenticated
  using (owner_id = (select auth.uid()) or public.mentors_student(owner_id)
         or (select public.has_permission('students.edit')))
  with check (owner_id = (select auth.uid()) or public.mentors_student(owner_id)
              or (select public.has_permission('students.edit')));
