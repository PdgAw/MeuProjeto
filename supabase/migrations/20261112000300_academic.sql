-- =============================================================================
-- NeoLevel · 0300 · Academic: subjects, lessons, materials, assignments, attendance
-- =============================================================================

-- Neo Progress dimensions — every subject/activity can contribute to some of them.
create type public.progress_dimension as enum
  ('learning', 'execution', 'mentoring', 'participation', 'venture', 'experiences', 'goals');

create type public.subject_status as enum ('draft', 'active', 'completed', 'archived');
create type public.subject_teacher_role as enum ('lead', 'guest', 'assistant');
create type public.lesson_type as enum ('class', 'workshop', 'masterclass', 'case', 'lab', 'dynamic', 'practical');
create type public.lesson_modality as enum ('in_person', 'online', 'hybrid');
create type public.online_provider as enum ('meet', 'zoom', 'teams', 'other');
create type public.lesson_status as enum ('scheduled', 'live', 'completed', 'canceled', 'rescheduled');
create type public.material_kind as enum ('file', 'link', 'video', 'slides');
create type public.assignment_status as enum ('draft', 'published', 'closed');
create type public.submission_status as enum ('draft', 'submitted', 'late', 'reviewed', 'returned');
create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');
create type public.attendance_method as enum ('manual', 'self_checkin', 'qr_code');

create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- Disciplinas: data, never hardcoded. Admins add, edit or archive.
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  cover_url text,
  workload_hours numeric(6,1),
  period_label text,                         -- "2026 · Semestre 1"
  starts_on date,
  ends_on date,
  status public.subject_status not null default 'draft',
  dimensions public.progress_dimension[] not null default '{learning}',
  sort_order int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subjects_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();

create table public.subject_teachers (
  subject_id uuid not null references public.subjects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.subject_teacher_role not null default 'lead',
  primary key (subject_id, user_id)
);
create index subject_teachers_user_idx on public.subject_teachers (user_id);

create table public.subject_cohorts (
  subject_id uuid not null references public.subjects (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  primary key (subject_id, cohort_id)
);
create index subject_cohorts_cohort_idx on public.subject_cohorts (cohort_id);

create table public.subject_competencies (
  subject_id uuid not null references public.subjects (id) on delete cascade,
  competency_id uuid not null references public.competencies (id) on delete cascade,
  primary key (subject_id, competency_id)
);

-- Aulas ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  lesson_type public.lesson_type not null default 'class',
  modality public.lesson_modality not null default 'in_person',
  location text,                             -- "Academia FIESC"
  room text,                                 -- "Sala 02"
  online_provider public.online_provider,
  meeting_url text,
  teacher_id uuid references public.profiles (id) on delete set null,
  guest_name text,
  guest_title text,
  status public.lesson_status not null default 'scheduled',
  checkin_open boolean not null default false,
  checkin_code text,                         -- reserved for QR code check-in
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index lessons_cohort_time_idx on public.lessons (cohort_id, starts_at);
create index lessons_subject_idx on public.lessons (subject_id);
create index lessons_teacher_idx on public.lessons (teacher_id, starts_at);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  title text not null,
  kind public.material_kind not null default 'file',
  url text,
  storage_path text,                          -- bucket lesson-materials
  file_name text,
  mime_type text,
  size_bytes bigint,
  is_published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (url is not null or storage_path is not null)
);
create index lesson_materials_subject_idx on public.lesson_materials (subject_id);

-- Entregas ----------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  cohort_id uuid references public.cohorts (id) on delete cascade,  -- null = all cohorts of the subject
  title text not null,
  instructions text,
  due_at timestamptz,
  max_score numeric(6,2),
  dimension public.progress_dimension not null default 'execution',
  status public.assignment_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assignments_subject_idx on public.assignments (subject_id);
create index assignments_due_idx on public.assignments (due_at) where status = 'published';
create trigger assignments_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  link_url text,
  files jsonb not null default '[]'::jsonb,   -- [{path, name, mime, size}]
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  score numeric(6,2),
  feedback text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index submissions_student_idx on public.assignment_submissions (student_id);
create trigger submissions_updated_at before update on public.assignment_submissions
  for each row execute function public.set_updated_at();

-- Frequência -----------------------------------------------------------------------
create table public.attendance (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.attendance_status not null,
  method public.attendance_method not null default 'manual',
  checked_in_at timestamptz,
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (lesson_id, student_id)
);
create index attendance_student_idx on public.attendance (student_id);
create trigger attendance_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Helpers
-- =============================================================================
create or replace function public.is_subject_teacher(p_subject uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.subject_teachers where subject_id = p_subject and user_id = p_user)
$$;

-- Can manage the subject's content (lessons, materials, assignments, attendance)?
create or replace function public.can_teach_subject(p_subject uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_permission('subjects.manage', p_user) or public.is_subject_teacher(p_subject, p_user)
$$;

-- Is the user a Neoleader in a cohort that takes this subject?
create or replace function public.studies_subject(p_subject uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subject_cohorts sc
    join public.enrollments e on e.cohort_id = sc.cohort_id
    where sc.subject_id = p_subject and e.user_id = p_user and e.status in ('active', 'completed')
  )
$$;

create or replace function public.can_view_subject_content(p_subject uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_teach_subject(p_subject, p_user)
      or public.has_permission('classes.view', p_user)
      or public.studies_subject(p_subject, p_user)
$$;

-- Students cannot grade themselves: lock review fields unless the caller teaches the subject.
create or replace function public.guard_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_subject uuid;
  v_due timestamptz;
begin
  select a.subject_id, a.due_at into v_subject, v_due from public.assignments a where a.id = new.assignment_id;
  if auth.uid() is not null and not public.can_teach_subject(v_subject) then
    if tg_op = 'INSERT' then
      new.score := null; new.feedback := null; new.reviewed_by := null; new.reviewed_at := null;
    elsif new.score is distinct from old.score or new.feedback is distinct from old.feedback
       or new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Somente o professor pode avaliar a entrega.' using errcode = '42501';
    end if;
    if new.status in ('reviewed', 'returned') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
      raise exception 'Status inválido.' using errcode = '42501';
    end if;
    if new.status = 'submitted' and (tg_op = 'INSERT' or old.status = 'draft' or old.status = 'returned') then
      new.submitted_at := now();
      if v_due is not null and now() > v_due then new.status := 'late'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger submissions_guard before insert or update on public.assignment_submissions
  for each row execute function public.guard_submission();

-- Self check-in: only for the student's own cohort lessons while check-in is open.
create or replace function public.self_check_in(p_lesson uuid, p_code text default null)
returns public.attendance language plpgsql security definer set search_path = '' as $$
declare
  v_lesson public.lessons;
  v_row public.attendance;
  v_status public.attendance_status;
begin
  select * into v_lesson from public.lessons where id = p_lesson;
  if not found then raise exception 'Aula não encontrada.'; end if;
  if not public.is_cohort_member(v_lesson.cohort_id) then
    raise exception 'Você não está matriculado nesta turma.' using errcode = '42501';
  end if;
  if not v_lesson.checkin_open then raise exception 'O check-in desta aula não está aberto.'; end if;
  if v_lesson.checkin_code is not null and p_code is distinct from v_lesson.checkin_code then
    raise exception 'Código de check-in inválido.';
  end if;
  v_status := case when now() > v_lesson.starts_at + interval '15 minutes' then 'late' else 'present' end;
  insert into public.attendance (lesson_id, student_id, status, method, checked_in_at, recorded_by)
  values (p_lesson, auth.uid(), v_status, case when p_code is null then 'self_checkin' else 'qr_code' end::public.attendance_method, now(), auth.uid())
  on conflict (lesson_id, student_id) do update
    set status = excluded.status, method = excluded.method, checked_in_at = excluded.checked_in_at
    where public.attendance.status in ('absent')
  returning * into v_row;
  if v_row is null then
    select * into v_row from public.attendance where lesson_id = p_lesson and student_id = auth.uid();
  end if;
  return v_row;
end $$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.competencies enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_teachers enable row level security;
alter table public.subject_cohorts enable row level security;
alter table public.subject_competencies enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.attendance enable row level security;

create policy competencies_select on public.competencies for select to authenticated using (true);
create policy competencies_write on public.competencies for all to authenticated
  using ((select public.has_permission('subjects.manage'))) with check ((select public.has_permission('subjects.manage')));

-- The subject catalog is not sensitive; drafts only for managers/teachers.
create policy subjects_select on public.subjects for select to authenticated
  using (status <> 'draft' or public.can_teach_subject(id));
create policy subjects_insert on public.subjects for insert to authenticated
  with check ((select public.has_permission('subjects.manage')));
create policy subjects_update on public.subjects for update to authenticated
  using (public.can_teach_subject(id)) with check (public.can_teach_subject(id));
create policy subjects_delete on public.subjects for delete to authenticated
  using ((select public.has_permission('subjects.manage')));

create policy subject_teachers_select on public.subject_teachers for select to authenticated using (true);
create policy subject_teachers_write on public.subject_teachers for all to authenticated
  using ((select public.has_permission('subjects.manage'))) with check ((select public.has_permission('subjects.manage')));
create policy subject_cohorts_select on public.subject_cohorts for select to authenticated using (true);
create policy subject_cohorts_write on public.subject_cohorts for all to authenticated
  using ((select public.has_permission('subjects.manage'))) with check ((select public.has_permission('subjects.manage')));
create policy subject_competencies_select on public.subject_competencies for select to authenticated using (true);
create policy subject_competencies_write on public.subject_competencies for all to authenticated
  using ((select public.has_permission('subjects.manage'))) with check ((select public.has_permission('subjects.manage')));

create policy lessons_select on public.lessons for select to authenticated
  using (teacher_id = (select auth.uid()) or public.is_cohort_member(cohort_id)
         or public.can_teach_subject(subject_id) or (select public.has_permission('classes.view')));
create policy lessons_write on public.lessons for all to authenticated
  using (public.can_teach_subject(subject_id) or (select public.has_permission('lessons.manage')))
  with check (public.can_teach_subject(subject_id) or (select public.has_permission('lessons.manage')));

create policy materials_select on public.lesson_materials for select to authenticated
  using ((is_published and public.can_view_subject_content(subject_id)) or public.can_teach_subject(subject_id));
create policy materials_write on public.lesson_materials for all to authenticated
  using (public.can_teach_subject(subject_id)) with check (public.can_teach_subject(subject_id));

create policy assignments_select on public.assignments for select to authenticated
  using ((status <> 'draft' and public.can_view_subject_content(subject_id)
          and (cohort_id is null or public.is_cohort_member(cohort_id) or not public.studies_subject(subject_id)))
         or public.can_teach_subject(subject_id));
create policy assignments_write on public.assignments for all to authenticated
  using (public.can_teach_subject(subject_id)) with check (public.can_teach_subject(subject_id));

create policy submissions_select on public.assignment_submissions for select to authenticated
  using (student_id = (select auth.uid())
         or public.can_teach_subject((select a.subject_id from public.assignments a where a.id = assignment_id))
         or public.can_view_student(student_id));
create policy submissions_insert on public.assignment_submissions for insert to authenticated
  with check (student_id = (select auth.uid())
              and exists (select 1 from public.assignments a where a.id = assignment_id and a.status = 'published'
                          and public.studies_subject(a.subject_id)));
create policy submissions_update on public.assignment_submissions for update to authenticated
  using (student_id = (select auth.uid())
         or public.can_teach_subject((select a.subject_id from public.assignments a where a.id = assignment_id)))
  with check (student_id = (select auth.uid())
              or public.can_teach_subject((select a.subject_id from public.assignments a where a.id = assignment_id)));

create policy attendance_select on public.attendance for select to authenticated
  using (student_id = (select auth.uid()) or public.can_view_student(student_id));
create policy attendance_write on public.attendance for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id
                 and (l.teacher_id = (select auth.uid()) or public.can_teach_subject(l.subject_id)))
         or (select public.has_permission('attendance.manage')))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id
                      and (l.teacher_id = (select auth.uid()) or public.can_teach_subject(l.subject_id)))
              or (select public.has_permission('attendance.manage')));
