import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFile, type StoredFile } from '@/lib/storage'
import type { Database } from '@/types/database'

/** Latest announcements for the user (RLS already filters by audience), pinned first. */
export function useLatestAnnouncements(userId: string | undefined, limit = 4) {
  return useQuery({
    queryKey: ['announcements', 'latest', userId, limit],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, type, is_pinned, requires_ack, publish_at, announcement_reads(user_id, read_at)')
        .eq('status', 'published')
        .lte('publish_at', new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('publish_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data.map((a) => ({ ...a, isRead: a.announcement_reads.some((r) => r.user_id === userId) }))
    },
  })
}

// ------------------------------------------------------------------ full module ---
type Tables = Database['public']['Tables']
export type AnnouncementType = Database['public']['Enums']['announcement_type']
export type AudienceType = Database['public']['Enums']['audience_type']
export interface Target { target_type: AudienceType; target_id: string | null; role_key: string | null }

const FIELDS = 'id, title, body, type, status, publish_at, expires_at, is_pinned, requires_ack, attachments, created_at, author_id, author:profiles!announcements_author_id_fkey(full_name, avatar_url), announcement_targets(target_type, target_id, role_key), announcement_reads(user_id, read_at, acknowledged_at)'

export function useAnnouncements(userId: string | undefined) {
  return useQuery({
    queryKey: ['announcements', 'all', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select(FIELDS).neq('status', 'archived')
        .order('is_pinned', { ascending: false }).order('publish_at', { ascending: false }).limit(200)
      if (error) throw error
      return data.map((a) => {
        const r = a.announcement_reads.find((x) => x.user_id === userId)
        return { ...a, attachments: (a.attachments as unknown as StoredFile[]) ?? [], isRead: Boolean(r), ackAt: r?.acknowledged_at ?? null }
      })
    },
  })
}
export type AnnouncementRow = NonNullable<ReturnType<typeof useAnnouncements>['data']>[number]

export function useAnnouncementDetail(id: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['announcements', 'detail', id],
    enabled: Boolean(id && userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select(FIELDS).eq('id', id!).maybeSingle()
      if (error) throw error
      if (!data) return null
      const r = data.announcement_reads.find((x) => x.user_id === userId)
      return { ...data, attachments: (data.attachments as unknown as StoredFile[]) ?? [], isRead: Boolean(r), ackAt: r?.acknowledged_at ?? null }
    },
  })
}

export function useAnnouncementStats(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['announcements', 'stats', id],
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const [stats, people] = await Promise.all([
        supabase.rpc('announcement_stats', { p_announcement: id! }),
        supabase.rpc('announcement_recipients', { p_announcement: id! }),
      ])
      if (stats.error) throw stats.error
      if (people.error) throw people.error
      return { stats: stats.data[0], people: people.data }
    },
  })
}

export function useMarkAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; userId: string; ack?: boolean }) => {
      const now = new Date().toISOString()
      const { error } = v.ack
        ? await supabase.from('announcement_reads').upsert({ announcement_id: v.id, user_id: v.userId, acknowledged_at: now })
        : await supabase.from('announcement_reads').upsert({ announcement_id: v.id, user_id: v.userId }, { ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useSaveAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id?: string; fields: Omit<Tables['announcements']['Insert'], 'author_id' | 'attachments'>; targets: Target[]; keep: StoredFile[]; files: File[] }) => {
      const { data: me } = await supabase.auth.getUser()
      const { data, error } = v.id
        ? await supabase.from('announcements').update(v.fields).eq('id', v.id).select('id').single()
        : await supabase.from('announcements').insert({ ...v.fields, author_id: me.user!.id }).select('id').single()
      if (error) throw error
      const id = data.id
      const uploaded = await Promise.all(v.files.map((f) => uploadFile('announcements', id, f)))
      const { error: e1 } = await supabase.from('announcements').update({ attachments: [...v.keep, ...uploaded] as never }).eq('id', id)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('announcement_targets').delete().eq('announcement_id', id)
      if (e2) throw e2
      if (v.targets.length) {
        const { error: e3 } = await supabase.from('announcement_targets').insert(v.targets.map((t) => ({ ...t, announcement_id: id })))
        if (e3) throw new Error(e3.message.includes('row-level security') ? 'Você só pode direcionar comunicados às suas disciplinas.' : e3.message)
      }
      return id
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useAudienceOptions() {
  return useQuery({
    queryKey: ['audience-options'],
    queryFn: async () => {
      const [cohorts, subjects, roles, people] = await Promise.all([
        supabase.from('cohorts').select('id, name').neq('status', 'archived').order('name'),
        supabase.from('subjects').select('id, name, code, subject_teachers(user_id)').neq('status', 'archived').order('name'),
        supabase.from('roles').select('key, name').order('priority'),
        supabase.from('profiles').select('id, full_name').eq('status', 'active').order('full_name'),
      ])
      for (const r of [cohorts, subjects, roles, people]) if (r.error) throw r.error
      return { cohorts: cohorts.data!, subjects: subjects.data!, roles: roles.data!, people: people.data! }
    },
  })
}
