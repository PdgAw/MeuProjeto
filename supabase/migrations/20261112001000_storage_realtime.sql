-- =============================================================================
-- NeoLevel · 1000 · Storage buckets & policies, Realtime publication
-- Path conventions (first folder = owning record id):
--   avatars/<user_id>/...                    public read, owner write
--   covers/<kind>/<id>/...                   public read (subjects, experiences, ventures, cohorts)
--   documents/<document_id>/<version>/...    private
--   lesson-materials/<subject_id>/...        private
--   submissions/<assignment_id>/<student_id>/...  private
--   chat/<conversation_id>/...               private
--   ventures/<venture_id>/...                private (pitch decks, logos drafts)
--   experiences/<experience_id>/...          private (post-event photos & materials)
--   requests/<request_id>/...                private
-- =============================================================================

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('covers', 'covers', true, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('documents', 'documents', false, 52428800, null),
  ('lesson-materials', 'lesson-materials', false, 209715200, null),
  ('submissions', 'submissions', false, 52428800, null),
  ('chat', 'chat', false, 26214400, null),
  ('ventures', 'ventures', false, 52428800, null),
  ('experiences', 'experiences', false, 26214400, null),
  ('requests', 'requests', false, 26214400, null)
on conflict (id) do nothing;

-- Avatars ------------------------------------------------------------------------
create policy neo_avatars_read on storage.objects for select to authenticated, anon
  using (bucket_id = 'avatars');
create policy neo_avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy neo_avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy neo_avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Covers -------------------------------------------------------------------------
create or replace function public.can_write_cover(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case (storage.foldername(p_name))[1]
    when 'subjects' then public.can_teach_subject(public.try_uuid((storage.foldername(p_name))[2]))
    when 'experiences' then public.has_permission('events.manage')
    when 'cohorts' then public.has_permission('classes.edit')
    when 'ventures' then public.can_edit_venture(public.try_uuid((storage.foldername(p_name))[2]))
    else false
  end
$$;
create policy neo_covers_read on storage.objects for select to authenticated, anon
  using (bucket_id = 'covers');
create policy neo_covers_write on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.can_write_cover(name));
create policy neo_covers_update on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.can_write_cover(name));
create policy neo_covers_delete on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.can_write_cover(name));

-- Private buckets: one read rule and one write rule per bucket ----------------------
create or replace function public.can_read_object(p_bucket text, p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_f text[] := storage.foldername(p_name);
  v_id uuid := public.try_uuid(v_f[1]);
begin
  return case p_bucket
    when 'documents' then public.can_view_document(v_id)
    when 'lesson-materials' then public.can_view_subject_content(v_id)
    when 'submissions' then
      public.try_uuid(v_f[2]) = auth.uid()
      or public.can_teach_subject((select a.subject_id from public.assignments a where a.id = v_id))
    when 'chat' then public.is_conversation_member(v_id)
    when 'ventures' then public.can_view_venture(v_id)
      or exists (select 1 from public.pitch_submissions s where s.venture_id = v_id
                 and (public.is_panel_evaluator(s.round_id) or public.has_permission('panels.manage')))
    when 'experiences' then public.can_see_experience(v_id)
    when 'requests' then exists (select 1 from public.service_requests r where r.id = v_id
                                 and (r.requester_id = auth.uid() or public.has_permission('requests.manage')))
    else false
  end;
end $$;

create or replace function public.can_write_object(p_bucket text, p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_f text[] := storage.foldername(p_name);
  v_id uuid := public.try_uuid(v_f[1]);
begin
  return case p_bucket
    when 'documents' then public.has_permission('documents.upload')
      and exists (select 1 from public.documents d where d.id = v_id
                  and (d.created_by = auth.uid() or public.has_permission('documents.manage')))
    when 'lesson-materials' then public.can_teach_subject(v_id)
    when 'submissions' then public.try_uuid(v_f[2]) = auth.uid()
      and exists (select 1 from public.assignments a where a.id = v_id and public.studies_subject(a.subject_id))
    when 'chat' then public.is_conversation_member(v_id)
    when 'ventures' then public.can_edit_venture(v_id)
    when 'experiences' then public.has_permission('events.manage')
    when 'requests' then exists (select 1 from public.service_requests r where r.id = v_id
                                 and (r.requester_id = auth.uid() or public.has_permission('requests.manage')))
    else false
  end;
end $$;

create policy neo_private_read on storage.objects for select to authenticated
  using (bucket_id in ('documents', 'lesson-materials', 'submissions', 'chat', 'ventures', 'experiences', 'requests')
         and public.can_read_object(bucket_id, name));
create policy neo_private_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('documents', 'lesson-materials', 'submissions', 'chat', 'ventures', 'experiences', 'requests')
              and public.can_write_object(bucket_id, name));
create policy neo_private_update on storage.objects for update to authenticated
  using (bucket_id in ('documents', 'lesson-materials', 'submissions', 'chat', 'ventures', 'experiences', 'requests')
         and public.can_write_object(bucket_id, name));
-- Deleting files: uploader or the bucket's writer (documents keep history: managers only)
create policy neo_private_delete on storage.objects for delete to authenticated
  using (bucket_id in ('lesson-materials', 'submissions', 'chat', 'ventures', 'experiences', 'requests')
         and (owner = (select auth.uid()) or public.can_write_object(bucket_id, name))
         or (bucket_id = 'documents' and (select public.has_permission('documents.manage'))));

-- Realtime ------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['messages', 'conversation_members', 'conversations', 'notifications'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
