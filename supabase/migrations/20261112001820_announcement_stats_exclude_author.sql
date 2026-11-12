-- =============================================================================
-- NeoLevel · 1820 · Announcement reach excludes the author
-- A teacher who targets their own subject matched the audience and counted as a
-- recipient ("Enviado para 5" instead of 4).
-- =============================================================================
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
    where p.status = 'active'
      and p.id <> (select a.author_id from public.announcements a where a.id = p_announcement)
      and exists (select 1 from public.announcement_targets t where t.announcement_id = p_announcement
                  and public.audience_match(t.target_type, t.target_id, t.role_key, p.id))
  )
  select count(*)::int, count(r.user_id)::int, count(r.acknowledged_at)::int, (count(*) - count(r.user_id))::int
  from recipients rc
  left join public.announcement_reads r on r.announcement_id = p_announcement and r.user_id = rc.id;
end $$;

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
  where p.status = 'active'
    and p.id <> (select a.author_id from public.announcements a where a.id = p_announcement)
    and exists (select 1 from public.announcement_targets t where t.announcement_id = p_announcement
                and public.audience_match(t.target_type, t.target_id, t.role_key, p.id))
  order by r.read_at nulls first, p.full_name;
end $$;
