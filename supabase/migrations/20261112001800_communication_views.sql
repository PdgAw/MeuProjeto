-- =============================================================================
-- NeoLevel · 1800 · Communication: conversation list, group creation,
--   announcement/document recipient tracking, announcement attachments
-- =============================================================================

-- Conversation list for the signed-in user (title/avatar resolved for direct chats).
create or replace function public.my_conversations()
returns table (
  id uuid, type public.conversation_type, title text, avatar_url text, other_user_id uuid,
  last_message_at timestamptz, last_message text, last_sender_name text, unread int, is_muted boolean, member_count int
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.type,
    case when c.type = 'direct' then op.full_name else coalesce(c.title, 'Conversa') end,
    case when c.type = 'direct' then op.avatar_url else c.avatar_url end,
    op.id,
    c.last_message_at,
    lm.body_preview, lm.sender_name,
    (select count(*) from public.messages m where m.conversation_id = c.id and m.created_at > me.last_read_at
       and m.sender_id is distinct from auth.uid() and m.deleted_at is null)::int,
    me.is_muted,
    (select count(*) from public.conversation_members x where x.conversation_id = c.id)::int
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select p.id, p.full_name, p.avatar_url from public.conversation_members om join public.profiles p on p.id = om.user_id
    where om.conversation_id = c.id and om.user_id <> auth.uid() and c.type = 'direct' limit 1
  ) op on true
  left join lateral (
    select case when m.deleted_at is not null then 'Mensagem excluída'
                when m.body is null then '📎 Arquivo' else left(m.body, 120) end as body_preview,
           sp.full_name as sender_name
    from public.messages m left join public.profiles sp on sp.id = m.sender_id
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where me.user_id = auth.uid()
  order by c.last_message_at desc nulls last, c.created_at desc
$$;

-- Groups, cohort rooms and internal teams (staff only), created atomically.
create or replace function public.create_group_conversation(
  p_title text, p_type public.conversation_type, p_members uuid[], p_cohort uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_type = 'direct' then raise exception 'Use a conversa direta.'; end if;
  if not (public.has_permission('chat.manage') or public.has_permission('communications.create')) then
    raise exception 'Somente a equipe pode criar grupos.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_title), '') = '' then raise exception 'Dê um nome ao grupo.'; end if;
  insert into public.conversations (type, title, cohort_id, created_by) values (p_type, btrim(p_title), p_cohort, auth.uid()) returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id, role) values (v_id, auth.uid(), 'owner');
  insert into public.conversation_members (conversation_id, user_id)
  select v_id, u from (
    select unnest(coalesce(p_members, '{}')) as u
    union select e.user_id from public.enrollments e where p_cohort is not null and e.cohort_id = p_cohort and e.status = 'active'
  ) m where u <> auth.uid() and public.is_active_user(u)
  on conflict do nothing;
  return v_id;
end $$;

-- Who received / read / acknowledged an announcement (management view).
create or replace function public.announcement_recipients(p_announcement uuid)
returns table (user_id uuid, full_name text, avatar_url text, read_at timestamptz, acknowledged_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.can_manage_announcement(p_announcement) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  return query
  select p.id, p.full_name, p.avatar_url, r.read_at, r.acknowledged_at
  from public.profiles p
  left join public.announcement_reads r on r.announcement_id = p_announcement and r.user_id = p.id
  where p.status = 'active' and exists (select 1 from public.announcement_targets t where t.announcement_id = p_announcement
                                        and public.audience_match(t.target_type, t.target_id, t.role_key, p.id))
  order by r.read_at nulls first, p.full_name;
end $$;

-- Who must read / sign a document, and who already did.
create or replace function public.document_recipients(p_document uuid)
returns table (user_id uuid, full_name text, read_at timestamptz, signed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not (public.has_permission('documents.manage') or exists (select 1 from public.documents d where d.id = p_document and d.created_by = auth.uid())) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
  select p.id, p.full_name, a.read_at, a.signed_at
  from public.profiles p
  join public.documents d on d.id = p_document
  left join public.document_acknowledgements a on a.document_id = p_document and a.user_id = p.id
  where p.status = 'active' and (p.id = d.owner_user_id or exists (
    select 1 from public.document_targets t where t.document_id = p_document and public.audience_match(t.target_type, t.target_id, t.role_key, p.id)))
  order by a.read_at nulls first, p.full_name;
end $$;

-- Announcement attachments: announcements/<announcement_id>/<file>
insert into storage.buckets (id, name, public, file_size_limit) values ('announcements', 'announcements', false, 26214400)
on conflict (id) do nothing;
create policy neo_announcements_read on storage.objects for select to authenticated
  using (bucket_id = 'announcements' and (public.can_manage_announcement(public.try_uuid((storage.foldername(name))[1]))
         or public.is_announcement_recipient(public.try_uuid((storage.foldername(name))[1]))));
create policy neo_announcements_write on storage.objects for insert to authenticated
  with check (bucket_id = 'announcements' and public.can_manage_announcement(public.try_uuid((storage.foldername(name))[1])));
create policy neo_announcements_delete on storage.objects for delete to authenticated
  using (bucket_id = 'announcements' and public.can_manage_announcement(public.try_uuid((storage.foldername(name))[1])));
