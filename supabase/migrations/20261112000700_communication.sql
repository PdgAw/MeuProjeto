-- =============================================================================
-- NeoLevel · 0700 · Chat, Comunicados, Documentos, Agenda
-- =============================================================================

-- Shared audience model: all / cohort / subject / role / user ---------------------
create type public.audience_type as enum ('all', 'cohort', 'subject', 'role', 'user');

create or replace function public.audience_match(
  p_type public.audience_type, p_target uuid, p_role_key text, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'all' then public.is_active_user(p_user)
    when 'cohort' then public.is_cohort_member(p_target, p_user)
                       or exists (select 1 from public.cohorts c where c.id = p_target and c.coordinator_id = p_user)
    when 'subject' then public.studies_subject(p_target, p_user) or public.is_subject_teacher(p_target, p_user)
    when 'role' then public.has_role(p_role_key, p_user)
    when 'user' then p_target = p_user
  end
$$;

-- ------------------------------------------------------------------- Chat ------
create type public.conversation_type as enum ('direct', 'group', 'cohort', 'team');
create type public.conversation_role as enum ('owner', 'admin', 'member');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  title text,
  avatar_url text,
  cohort_id uuid references public.cohorts (id) on delete cascade,
  direct_key text unique,                       -- "<smaller uuid>:<larger uuid>" for direct chats
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  check (type <> 'direct' or direct_key is not null)
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.conversation_role not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  is_muted boolean not null default false,
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text,
  reply_to_id uuid references public.messages (id) on delete set null,
  attachments jsonb not null default '[]'::jsonb,   -- [{path, name, mime, size}] in bucket chat
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  search tsvector generated always as (to_tsvector('portuguese', coalesce(body, ''))) stored,
  check (body is not null or jsonb_array_length(attachments) > 0 or deleted_at is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_search_idx on public.messages using gin (search);

create or replace function public.is_conversation_member(p_conversation uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conversation and user_id = p_user)
$$;

create or replace function public.is_conversation_admin(p_conversation uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members
                 where conversation_id = p_conversation and user_id = p_user and role in ('owner', 'admin'))
$$;

create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
   where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end $$;
create trigger messages_bump after insert on public.messages
  for each row execute function public.bump_conversation();

-- Edits: only the body/attachments of your own message; deletion is soft.
create or replace function public.guard_message_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.conversation_id <> old.conversation_id or new.sender_id is distinct from old.sender_id
     or new.created_at <> old.created_at then
    raise exception 'Operação não permitida.' using errcode = '42501';
  end if;
  if old.deleted_at is not null then raise exception 'Mensagem excluída.'; end if;
  if new.deleted_at is not null then
    new.body := null; new.attachments := '[]'::jsonb;
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end $$;
create trigger messages_guard before update on public.messages
  for each row execute function public.guard_message_update();

create or replace function public.get_or_create_direct_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_key text;
  v_id uuid;
begin
  if v_me is null or p_other is null or p_other = v_me then raise exception 'Conversa inválida.'; end if;
  if not public.is_active_user(p_other) then raise exception 'Usuário indisponível.'; end if;
  v_key := least(v_me::text, p_other::text) || ':' || greatest(v_me::text, p_other::text);
  select id into v_id from public.conversations where direct_key = v_key;
  if v_id is null then
    insert into public.conversations (type, direct_key, created_by) values ('direct', v_key, v_me)
    returning id into v_id;
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_id, v_me, 'member'), (v_id, p_other, 'member');
  end if;
  return v_id;
end $$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language sql security definer set search_path = '' as $$
  update public.conversation_members set last_read_at = now()
  where conversation_id = p_conversation and user_id = auth.uid()
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy conversations_select on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
-- Groups/teams/cohort rooms are created by staff; direct chats via the RPC.
create policy conversations_insert on public.conversations for insert to authenticated
  with check (type <> 'direct' and created_by = (select auth.uid())
              and ((select public.has_permission('chat.manage')) or (select public.has_permission('communications.create'))));
create policy conversations_update on public.conversations for update to authenticated
  using (public.is_conversation_admin(id) or (select public.has_permission('chat.manage')))
  with check (public.is_conversation_admin(id) or (select public.has_permission('chat.manage')));
create policy conversations_delete on public.conversations for delete to authenticated
  using ((select public.has_permission('chat.manage')));

create policy members_select on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy members_insert on public.conversation_members for insert to authenticated
  with check (public.is_conversation_admin(conversation_id) or (select public.has_permission('chat.manage'))
              or exists (select 1 from public.conversations c where c.id = conversation_id
                         and c.created_by = (select auth.uid()) and c.type <> 'direct'));
-- Own row: read marker and mute. Admins manage roles.
create policy members_update on public.conversation_members for update to authenticated
  using (user_id = (select auth.uid()) or public.is_conversation_admin(conversation_id))
  with check (user_id = (select auth.uid()) or public.is_conversation_admin(conversation_id));
create policy members_delete on public.conversation_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_conversation_admin(conversation_id)
         or (select public.has_permission('chat.manage')));

create policy messages_select on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id));
create policy messages_update on public.messages for update to authenticated
  using (sender_id = (select auth.uid()) or (select public.has_permission('chat.manage')))
  with check (sender_id = (select auth.uid()) or (select public.has_permission('chat.manage')));

-- ------------------------------------------------------------- Comunicados ------
create type public.announcement_type as enum ('academic', 'urgent', 'event', 'mentoring', 'institutional', 'administrative');
create type public.announcement_status as enum ('draft', 'published', 'archived');

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type public.announcement_type not null default 'institutional',
  author_id uuid not null references public.profiles (id) on delete cascade,
  status public.announcement_status not null default 'draft',
  publish_at timestamptz not null default now(),   -- future date = scheduled
  expires_at timestamptz,
  is_pinned boolean not null default false,
  requires_ack boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index announcements_publish_idx on public.announcements (publish_at desc) where status = 'published';
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create table public.announcement_targets (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  target_type public.audience_type not null,
  target_id uuid,
  role_key text,
  check ((target_type = 'all') or (target_type = 'role' and role_key is not null)
         or (target_type in ('cohort', 'subject', 'user') and target_id is not null))
);
create index announcement_targets_announcement_idx on public.announcement_targets (announcement_id);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  primary key (announcement_id, user_id)
);

create or replace function public.can_manage_announcement(p_announcement uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_permission('communications.create', p_user)
      or exists (select 1 from public.announcements a where a.id = p_announcement and a.author_id = p_user)
$$;

create or replace function public.is_announcement_recipient(p_announcement uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.announcements a
    join public.announcement_targets t on t.announcement_id = a.id
    where a.id = p_announcement and a.status = 'published' and a.publish_at <= now()
      and (a.expires_at is null or a.expires_at > now())
      and public.audience_match(t.target_type, t.target_id, t.role_key, p_user)
  )
$$;

create or replace function public.announcement_stats(p_announcement uuid)
returns table (sent int, read int, acknowledged int, pending int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_manage_announcement(p_announcement) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
  with recipients as (
    select p.id from public.profiles p
    where p.status = 'active' and exists (
      select 1 from public.announcement_targets t where t.announcement_id = p_announcement
        and public.audience_match(t.target_type, t.target_id, t.role_key, p.id))
  )
  select count(*)::int,
         count(r.user_id)::int,
         count(r.acknowledged_at)::int,
         (count(*) - count(r.user_id))::int
  from recipients rc
  left join public.announcement_reads r on r.announcement_id = p_announcement and r.user_id = rc.id;
end $$;

alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.announcement_reads enable row level security;

create policy announcements_select on public.announcements for select to authenticated
  using (public.can_manage_announcement(id) or public.is_announcement_recipient(id));
-- Communications staff, or teachers (who may only target their own subjects — see targets policy).
create policy announcements_insert on public.announcements for insert to authenticated
  with check (author_id = (select auth.uid())
              and ((select public.has_permission('communications.create')) or (select public.has_role('teacher'))));
create policy announcements_update on public.announcements for update to authenticated
  using (public.can_manage_announcement(id)) with check (public.can_manage_announcement(id));
create policy announcements_delete on public.announcements for delete to authenticated
  using (public.can_manage_announcement(id));

create policy announcement_targets_select on public.announcement_targets for select to authenticated
  using (public.can_manage_announcement(announcement_id) or public.is_announcement_recipient(announcement_id));
create policy announcement_targets_write on public.announcement_targets for all to authenticated
  using (public.can_manage_announcement(announcement_id))
  with check (public.can_manage_announcement(announcement_id)
              and ((select public.has_permission('communications.create'))
                   or (target_type = 'subject' and public.is_subject_teacher(target_id))));

create policy announcement_reads_select on public.announcement_reads for select to authenticated
  using (user_id = (select auth.uid()) or public.can_manage_announcement(announcement_id));
create policy announcement_reads_insert on public.announcement_reads for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_announcement_recipient(announcement_id));
create policy announcement_reads_update on public.announcement_reads for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- -------------------------------------------------------------- Documentos ------
create type public.document_category as enum
  ('academic', 'administrative', 'contract', 'term', 'certificate', 'material', 'project', 'financial', 'other');
create type public.document_status as enum ('available', 'required_reading', 'signature_pending', 'expired');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category public.document_category not null default 'other',
  status public.document_status not null default 'available',
  owner_user_id uuid references public.profiles (id) on delete cascade,  -- personal doc (contract, certificate)
  current_version int not null default 0,
  expires_at timestamptz,
  requires_signature boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_owner_idx on public.documents (owner_user_id);
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version int not null,
  storage_path text not null,                    -- bucket documents: <document_id>/<version>/<file>
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table public.document_targets (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  target_type public.audience_type not null,
  target_id uuid,
  role_key text
);
create index document_targets_document_idx on public.document_targets (document_id);

-- Read receipts + e-signature hooks (provider integration in a later phase)
create table public.document_acknowledgements (
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz,
  signed_at timestamptz,
  signature_provider text,
  signature_reference text,
  primary key (document_id, user_id)
);

create or replace function public.can_view_document(p_document uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d where d.id = p_document and (
      public.has_permission('documents.manage', p_user)
      or d.created_by = p_user
      or d.owner_user_id = p_user
      or (public.has_permission('documents.view', p_user) and exists (
            select 1 from public.document_targets t where t.document_id = d.id
              and public.audience_match(t.target_type, t.target_id, t.role_key, p_user)))
    )
  )
$$;

create or replace function public.bump_document_version()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.documents set current_version = greatest(current_version, new.version) where id = new.document_id;
  return new;
end $$;
create trigger document_versions_bump after insert on public.document_versions
  for each row execute function public.bump_document_version();

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_targets enable row level security;
alter table public.document_acknowledgements enable row level security;

create policy documents_select on public.documents for select to authenticated using (public.can_view_document(id));
create policy documents_insert on public.documents for insert to authenticated
  with check (created_by = (select auth.uid()) and (select public.has_permission('documents.upload')));
create policy documents_update on public.documents for update to authenticated
  using ((select public.has_permission('documents.manage')) or created_by = (select auth.uid()))
  with check ((select public.has_permission('documents.manage')) or created_by = (select auth.uid()));
create policy documents_delete on public.documents for delete to authenticated
  using ((select public.has_permission('documents.manage')));

create policy document_versions_select on public.document_versions for select to authenticated
  using (public.can_view_document(document_id));
create policy document_versions_insert on public.document_versions for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and (select public.has_permission('documents.upload'))
              and exists (select 1 from public.documents d where d.id = document_id
                          and (d.created_by = (select auth.uid()) or (select public.has_permission('documents.manage')))));

create policy document_targets_select on public.document_targets for select to authenticated
  using (public.can_view_document(document_id));
create policy document_targets_write on public.document_targets for all to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id
                 and (d.created_by = (select auth.uid()) or (select public.has_permission('documents.manage')))))
  with check (exists (select 1 from public.documents d where d.id = document_id
                      and (d.created_by = (select auth.uid()) or (select public.has_permission('documents.manage')))));

create policy document_ack_select on public.document_acknowledgements for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('documents.manage')));
create policy document_ack_write on public.document_acknowledgements for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_document(document_id));
create policy document_ack_update on public.document_acknowledgements for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ------------------------------------------------------------------ Agenda ------
create type public.agenda_type as enum ('class', 'mentoring', 'event', 'visit', 'deadline', 'panel', 'meeting');

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type public.agenda_type not null default 'meeting',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  meeting_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.calendar_event_targets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  target_type public.audience_type not null,
  target_id uuid,
  role_key text
);

alter table public.calendar_events enable row level security;
alter table public.calendar_event_targets enable row level security;

create policy calendar_events_select on public.calendar_events for select to authenticated
  using (created_by = (select auth.uid()) or (select public.has_permission('events.manage'))
         or exists (select 1 from public.calendar_event_targets t where t.event_id = calendar_events.id
                    and public.audience_match(t.target_type, t.target_id, t.role_key)));
create policy calendar_events_write on public.calendar_events for all to authenticated
  using (created_by = (select auth.uid()) or (select public.has_permission('events.manage')))
  with check (created_by = (select auth.uid()) or (select public.has_permission('events.manage')));
create policy calendar_event_targets_select on public.calendar_event_targets for select to authenticated
  using (exists (select 1 from public.calendar_events e where e.id = event_id));
create policy calendar_event_targets_write on public.calendar_event_targets for all to authenticated
  using (exists (select 1 from public.calendar_events e where e.id = event_id
                 and (e.created_by = (select auth.uid()) or (select public.has_permission('events.manage')))))
  with check (exists (select 1 from public.calendar_events e where e.id = event_id
                      and (e.created_by = (select auth.uid()) or (select public.has_permission('events.manage')))));

-- Personal agenda: everything relevant to the caller, from every module.
-- SECURITY INVOKER: underlying RLS still applies on top of the personal filters.
create or replace function public.my_agenda(p_from timestamptz, p_to timestamptz)
returns table (
  item_type public.agenda_type, source text, source_id uuid, title text, subtitle text,
  starts_at timestamptz, ends_at timestamptz, location text, url text, status text
) language sql stable set search_path = '' as $$
  select 'class'::public.agenda_type, 'lesson', l.id, l.title, s.name, l.starts_at, l.ends_at,
         concat_ws(' · ', l.room, l.location), l.meeting_url, l.status::text
  from public.lessons l join public.subjects s on s.id = l.subject_id
  where l.starts_at < p_to and l.ends_at > p_from
    and (public.is_cohort_member(l.cohort_id) or l.teacher_id = auth.uid() or public.is_subject_teacher(l.subject_id))
  union all
  select 'mentoring', 'mentoring_session', m.id, 'Mentoria', p.full_name, m.scheduled_at,
         m.scheduled_at + make_interval(mins => m.duration_min), m.location, m.meeting_url, m.status::text
  from public.mentoring_sessions m
  join public.profiles p on p.id = case when m.student_id = auth.uid() then m.mentor_id else m.student_id end
  where m.scheduled_at >= p_from and m.scheduled_at < p_to and m.status in ('scheduled', 'completed')
    and auth.uid() in (m.student_id, m.mentor_id)
  union all
  select case when x.category = 'company_visit' then 'visit' else 'event' end::public.agenda_type,
         'experience', x.id, x.title, x.category::text, x.starts_at, x.ends_at, x.location, null,
         coalesce(r.status::text, x.status::text)
  from public.experiences x
  left join public.experience_registrations r on r.experience_id = x.id and r.user_id = auth.uid()
  where x.starts_at >= p_from and x.starts_at < p_to and x.status in ('published', 'completed')
  union all
  select 'deadline', 'assignment', a.id, a.title, s.name, a.due_at, a.due_at, null, null, a.status::text
  from public.assignments a join public.subjects s on s.id = a.subject_id
  where a.due_at >= p_from and a.due_at < p_to and a.status = 'published'
    and (public.studies_subject(a.subject_id) or public.is_subject_teacher(a.subject_id))
  union all
  select 'panel', 'pitch_submission', ps.id, 'Banca: ' || v.name, pr.name, ps.panel_at,
         ps.panel_at + interval '30 minutes', pr.location, null, ps.status::text
  from public.pitch_submissions ps
  join public.panel_rounds pr on pr.id = ps.round_id
  join public.ventures v on v.id = ps.venture_id
  where ps.panel_at >= p_from and ps.panel_at < p_to
    and (public.is_venture_member(ps.venture_id) or public.is_panel_evaluator(ps.round_id))
  union all
  select e.event_type, 'calendar_event', e.id, e.title, e.description, e.starts_at, e.ends_at,
         e.location, e.meeting_url, null
  from public.calendar_events e
  where e.starts_at < p_to and coalesce(e.ends_at, e.starts_at) >= p_from
  order by 6
$$;
