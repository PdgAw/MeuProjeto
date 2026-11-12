import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
export type ExperienceCategory = Database['public']['Enums']['experience_category']
export type RegistrationStatus = Database['public']['Enums']['registration_status']

const inv = (qc: ReturnType<typeof useQueryClient>) => {
  for (const k of ['experiences', 'experience', 'agenda', 'journey', 'neo-progress', 'achievements']) void qc.invalidateQueries({ queryKey: [k] })
}

export function useExperiences() {
  return useQuery({
    queryKey: ['experiences'],
    queryFn: async () => {
      const { data, error } = await supabase.from('experiences')
        .select('id, category, title, description, cover_url, starts_at, ends_at, location, capacity, status, cohort_id, registration_open, registration_deadline, is_educational, companies, cohort:cohorts(name), experience_registrations(user_id, status, checked_in_at)')
        .neq('status', 'canceled').order('starts_at')
      if (error) throw error
      return data
    },
  })
}
export type ExperienceItem = NonNullable<ReturnType<typeof useExperiences>['data']>[number]

export function useExperience(id: string | undefined) {
  return useQuery({
    queryKey: ['experience', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('experiences')
        .select('*, cohort:cohorts(name), owner:profiles!experiences_owner_id_fkey(full_name), experience_media(id, kind, title, url, storage_path, body, created_at), experience_registrations(user_id, status, checked_in_at, registered_at, user:profiles!experience_registrations_user_id_fkey(full_name, avatar_url)), experience_reflections(user_id, main_learning, application, rating, feedback, created_at, user:profiles!experience_reflections_user_id_fkey(full_name))')
        .eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}
export type ExperienceDetail = NonNullable<ReturnType<typeof useExperience>['data']>

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('register_for_experience', { p_experience: id })
      if (error) throw error
      return data
    },
    onSuccess: () => inv(qc),
  })
}
export function useCancelRegistration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc('cancel_experience_registration', { p_experience: id }); if (error) throw error },
    onSuccess: () => inv(qc),
  })
}
export function useExperienceCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc('experience_self_check_in', { p_experience: id }); if (error) throw error },
    onSuccess: () => inv(qc),
  })
}
export function useSaveReflection(experienceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { userId: string; main_learning: string; application: string; rating: number | null; feedback: string }) => {
      const { error } = await supabase.from('experience_reflections').upsert({ experience_id: experienceId, user_id: v.userId, main_learning: v.main_learning || null, application: v.application || null, rating: v.rating, feedback: v.feedback || null })
      if (error) throw error
    },
    onSuccess: () => inv(qc),
  })
}
export function useSetRegistration(experienceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { userId: string; status: RegistrationStatus }) => {
      const { error } = await supabase.from('experience_registrations').update({ status: v.status, checked_in_at: v.status === 'attended' ? new Date().toISOString() : null })
        .eq('experience_id', experienceId).eq('user_id', v.userId)
      if (error) throw error
    },
    onSuccess: () => inv(qc),
  })
}
export function useSaveExperience() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...f }: Tables['experiences']['Insert']) => {
      const { data, error } = id
        ? await supabase.from('experiences').update(f).eq('id', id).select('id').single()
        : await supabase.from('experiences').insert(f).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => inv(qc),
  })
}
export function useAddMedia(experienceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { kind: 'photo' | 'material' | 'insight' | 'link'; title: string; file?: File | null; url?: string; body?: string }) => {
      const { data: me } = await supabase.auth.getUser()
      const stored = v.file ? await uploadFile('experiences', experienceId, v.file) : null
      const { error } = await supabase.from('experience_media').insert({ experience_id: experienceId, kind: v.kind, title: v.title || null, storage_path: stored?.path ?? null, url: v.url || null, body: v.body || null, created_by: me.user?.id })
      if (error) throw error
    },
    onSuccess: () => inv(qc),
  })
}

/** "Adicionar ao calendário": a standard .ics file works with Google, Outlook and Apple. */
export function downloadIcs(x: { id: string; title: string; description?: string | null; starts_at: string; ends_at?: string | null; location?: string | null }) {
  const f = (d: string) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
  const end = x.ends_at ?? new Date(new Date(x.starts_at).getTime() + 2 * 3600e3).toISOString()
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NeoLevel//Experiencias Neo//PT', 'BEGIN:VEVENT', `UID:${x.id}@neolevel`,
    `DTSTAMP:${f(new Date().toISOString())}`, `DTSTART:${f(x.starts_at)}`, `DTEND:${f(end)}`, `SUMMARY:${esc(x.title)}`,
    x.location ? `LOCATION:${esc(x.location)}` : '', x.description ? `DESCRIPTION:${esc(x.description)}` : '', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${x.title.replace(/[^\w]+/g, '-').toLowerCase()}.ics` })
  a.click(); URL.revokeObjectURL(url)
}
