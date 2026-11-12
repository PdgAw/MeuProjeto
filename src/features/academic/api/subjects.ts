import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type SubjectStatus = Database['public']['Enums']['subject_status']
type Dimension = Database['public']['Enums']['progress_dimension']

const SUBJECT_CARD = 'id, code, name, description, cover_url, status, workload_hours, period_label, starts_on, ends_on, dimensions, sort_order, subject_teachers(role, teacher:profiles(id, full_name, avatar_url)), subject_cohorts(cohort:cohorts(id, name)), lessons(id, starts_at, status, cohort_id)'

/** Subjects visible to the caller (RLS: catalog + drafts for managers/teachers). */
export function useSubjects({ includeArchived = false } = {}) {
  return useQuery({
    queryKey: ['subjects', { includeArchived }],
    queryFn: async () => {
      let q = supabase.from('subjects').select(SUBJECT_CARD).order('sort_order').order('name')
      if (!includeArchived) q = q.neq('status', 'archived')
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}
export type SubjectCard = NonNullable<ReturnType<typeof useSubjects>['data']>[number]

/** Lessons done / total for the cohorts the viewer cares about (all, for staff). */
export function subjectProgress(s: SubjectCard, cohortId?: string | null) {
  const lessons = s.lessons.filter((l) => l.status !== 'canceled' && (!cohortId || l.cohort_id === cohortId))
  const done = lessons.filter((l) => new Date(l.starts_at) < new Date()).length
  return { done, total: lessons.length, percent: lessons.length ? Math.round((100 * done) / lessons.length) : 0 }
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: ['subject', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select(`${SUBJECT_CARD}, subject_competencies(competency:competencies(id, name))`)
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
export type SubjectDetail = NonNullable<ReturnType<typeof useSubject>['data']>

export function useSubjectResults(subjectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['subject-results', subjectId],
    enabled: Boolean(subjectId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('subject_results', { p_subject: subjectId! })
      if (error) throw error
      return data
    },
  })
}

/** Announcements targeted at this subject. */
export function useSubjectAnnouncements(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['subject-announcements', subjectId],
    enabled: Boolean(subjectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, type, publish_at, author:profiles!announcements_author_id_fkey(full_name), announcement_targets!inner(target_type, target_id)')
        .eq('announcement_targets.target_type', 'subject')
        .eq('announcement_targets.target_id', subjectId!)
        .eq('status', 'published')
        .order('publish_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCohorts() {
  return useQuery({
    queryKey: ['cohorts', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cohorts').select('id, name, status').neq('status', 'archived').order('starts_on', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Profiles holding a role (e.g. teachers for subject assignment). */
export function usePeopleWithRole(roleKey: string) {
  return useQuery({
    queryKey: ['people-with-role', roleKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user:profiles!user_roles_user_id_fkey(id, full_name, avatar_url, job_title, status), role:roles!inner(key)')
        .eq('role.key', roleKey)
      if (error) throw error
      return data.map((r) => r.user).filter((u): u is NonNullable<typeof u> => Boolean(u)).sort((a, b) => a.full_name.localeCompare(b.full_name))
    },
  })
}

export interface SubjectInput {
  id?: string
  code: string
  name: string
  description: string | null
  workload_hours: number | null
  period_label: string | null
  starts_on: string | null
  ends_on: string | null
  status: SubjectStatus
  dimensions: Dimension[]
  teacherIds: string[]
  cohortIds: string[]
}

/** Create/update a subject and replace its teacher & cohort links. */
export function useSaveSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, teacherIds, cohortIds, ...fields }: SubjectInput) => {
      const { data, error } = id
        ? await supabase.from('subjects').update(fields).eq('id', id).select('id').single()
        : await supabase.from('subjects').insert(fields).select('id').single()
      if (error) throw new Error(error.code === '23505' ? 'Já existe uma disciplina com este código.' : error.message)
      const subjectId = data.id
      const [t, c] = await Promise.all([
        supabase.from('subject_teachers').delete().eq('subject_id', subjectId),
        supabase.from('subject_cohorts').delete().eq('subject_id', subjectId),
      ])
      if (t.error) throw t.error
      if (c.error) throw c.error
      if (teacherIds.length) {
        const { error: e } = await supabase.from('subject_teachers')
          .insert(teacherIds.map((user_id, i) => ({ subject_id: subjectId, user_id, role: i === 0 ? 'lead' as const : 'guest' as const })))
        if (e) throw e
      }
      if (cohortIds.length) {
        const { error: e } = await supabase.from('subject_cohorts').insert(cohortIds.map((cohort_id) => ({ subject_id: subjectId, cohort_id })))
        if (e) throw e
      }
      return subjectId
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ['subjects'] })
      void qc.invalidateQueries({ queryKey: ['subject', id] })
    },
  })
}

export function useSetSubjectStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubjectStatus }) => {
      const { error } = await supabase.from('subjects').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['subjects'] }),
  })
}
