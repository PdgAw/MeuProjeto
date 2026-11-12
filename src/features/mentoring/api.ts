import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFile, type StoredFile } from '@/lib/storage'
import type { Database } from '@/types/database'

type Enums = Database['public']['Enums']

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  for (const k of ['mentoring', 'mentor-mentees', 'session', 'goals', 'neo-progress', 'agenda', 'journey']) void qc.invalidateQueries({ queryKey: [k] })
}

// ------------------------------------------------------------------ queries ---
export function useUpcomingMentorings(userId: string | undefined, limit = 3) {
  return useQuery({
    queryKey: ['mentoring', 'upcoming', userId, limit],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('mentoring_sessions')
        .select('id, scheduled_at, duration_min, modality, location, meeting_url, topics, status, mentor:profiles!mentoring_sessions_mentor_id_fkey(id, full_name, avatar_url, job_title)')
        .eq('student_id', userId!).eq('status', 'scheduled')
        .gte('scheduled_at', new Date(Date.now() - 60 * 60_000).toISOString()).order('scheduled_at').limit(limit)
      if (error) throw error
      return data
    },
  })
}

/** The Neoleader's Neomentores with their professional profile. */
export function useMyMentors(studentId: string | undefined) {
  return useQuery({
    queryKey: ['mentoring', 'my-mentors', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await supabase.from('mentor_assignments')
        .select('id, focus, started_on, mentor:profiles!mentor_assignments_mentor_id_fkey(id, full_name, avatar_url, job_title, professional_profiles(headline, company, position, specialties))')
        .eq('student_id', studentId!).eq('is_active', true)
      if (error) throw error
      return data
    },
  })
}

const SESSION_FIELDS = 'id, mentor_id, student_id, scheduled_at, duration_min, modality, location, meeting_url, topics, status, request_note, summary, difficulties, decisions, shared_notes, files, completed_at, canceled_reason, created_at, mentor:profiles!mentoring_sessions_mentor_id_fkey(id, full_name, avatar_url, job_title), student:profiles!mentoring_sessions_student_id_fkey(id, full_name, avatar_url)'

/** Sessions where the caller is student or mentor (or all, for mentoring.view). */
export function useSessions(filter: { studentId?: string; mentorId?: string }) {
  return useQuery({
    queryKey: ['mentoring', 'sessions', filter],
    queryFn: async () => {
      let q = supabase.from('mentoring_sessions').select(SESSION_FIELDS).order('scheduled_at', { ascending: false, nullsFirst: true })
      if (filter.studentId) q = q.eq('student_id', filter.studentId)
      if (filter.mentorId) q = q.eq('mentor_id', filter.mentorId)
      const { data, error } = await q.limit(200)
      if (error) throw error
      return data.map((s) => ({ ...s, files: (s.files as unknown as StoredFile[]) ?? [] }))
    },
  })
}
export type Session = NonNullable<ReturnType<typeof useSessions>['data']>[number]

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['session', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('mentoring_sessions').select(SESSION_FIELDS).eq('id', id!).maybeSingle()
      if (error) throw error
      return data ? { ...data, files: (data.files as unknown as StoredFile[]) ?? [] } : null
    },
  })
}

/** Private notes — RLS returns nothing to the Neoleader, ever. */
export function usePrivateNotes(studentId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['mentoring', 'private-notes', studentId],
    enabled: Boolean(studentId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('mentoring_private_notes')
        .select('id, content, created_at, session_id, author:profiles!mentoring_private_notes_author_id_fkey(full_name)')
        .eq('student_id', studentId!).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useActionItems(filter: { sessionId?: string; studentId?: string; openOnly?: boolean }) {
  return useQuery({
    queryKey: ['mentoring', 'action-items', filter],
    enabled: Boolean(filter.sessionId || filter.studentId),
    queryFn: async () => {
      let q = supabase.from('mentoring_action_items').select('id, session_id, student_id, title, due_date, status, completed_at, sort_order')
      if (filter.sessionId) q = q.eq('session_id', filter.sessionId)
      if (filter.studentId) q = q.eq('student_id', filter.studentId)
      if (filter.openOnly) q = q.eq('status', 'open')
      const { data, error } = await q.order('due_date', { nullsFirst: false }).order('sort_order')
      if (error) throw error
      return data
    },
  })
}
/** Back-compat for the dashboard. */
export const useOpenActionItems = (userId: string | undefined) => useActionItems({ studentId: userId, openOnly: true })

export function useGoals(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['goals', ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase.from('goals')
        .select('id, title, description, dimension, due_date, status, progress, source, completed_at, created_at, author:profiles!goals_created_by_fkey(full_name)')
        .eq('owner_id', ownerId!).neq('status', 'canceled').order('status').order('due_date', { nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}
export type Goal = NonNullable<ReturnType<typeof useGoals>['data']>[number]

export function useMentorMentees(mentorId?: string) {
  return useQuery({
    queryKey: ['mentor-mentees', mentorId ?? 'me'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mentor_mentees', mentorId ? { p_mentor: mentorId } : {})
      if (error) throw error
      return data
    },
  })
}
export type Mentee = NonNullable<ReturnType<typeof useMentorMentees>['data']>[number]

/** Management: all Neomentores and their active mentees. */
export function useMentorsOverview() {
  return useQuery({
    queryKey: ['mentoring', 'mentors-overview'],
    queryFn: async () => {
      const [mentors, links] = await Promise.all([
        supabase.from('user_roles').select('roles!inner(key), profile:profiles!user_roles_user_id_fkey(id, full_name, avatar_url, job_title, status, professional_profiles(company, specialties))').eq('roles.key', 'mentor'),
        supabase.from('mentor_assignments').select('id, mentor_id, focus, started_on, student:profiles!mentor_assignments_student_id_fkey(id, full_name, avatar_url)').eq('is_active', true),
      ])
      if (mentors.error) throw mentors.error
      if (links.error) throw links.error
      return mentors.data.map((m) => m.profile).filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({ ...p, mentees: links.data.filter((l) => l.mentor_id === p.id) }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
    },
  })
}

// ---------------------------------------------------------------- mutations ---
export function useRequestMentoring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { mentorId: string; preferredAt: string | null; topics: string[]; note: string }) => {
      const { error } = await supabase.rpc('request_mentoring', { p_mentor: v.mentorId, p_preferred_at: v.preferredAt ?? undefined, p_topics: v.topics, p_note: v.note })
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useScheduleSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id?: string; mentorId: string; studentId: string; scheduledAt: string; durationMin: number; modality: Enums['lesson_modality']; location: string | null; meetingUrl: string | null; topics: string[] }) => {
      const row = { scheduled_at: v.scheduledAt, duration_min: v.durationMin, modality: v.modality, location: v.location, meeting_url: v.meetingUrl, topics: v.topics, status: 'scheduled' as const }
      const { error } = v.id
        ? await supabase.from('mentoring_sessions').update(row).eq('id', v.id)
        : await supabase.from('mentoring_sessions').insert({ ...row, mentor_id: v.mentorId, student_id: v.studentId })
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCancelSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; reason: string }) => {
      const { error } = await supabase.rpc('cancel_mentoring_session', { p_session: v.id, p_reason: v.reason })
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCompleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; summary: string; difficulties: string; decisions: string; nextSteps: string[]; dueInDays: number; privateNote: string }) => {
      const { error } = await supabase.rpc('complete_mentoring_session', {
        p_session: v.id, p_summary: v.summary, p_difficulties: v.difficulties || undefined, p_decisions: v.decisions || undefined,
        p_next_steps: v.nextSteps, p_due_in_days: v.dueInDays, p_private_note: v.privateNote || undefined,
      })
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateSharedRecord(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { summary?: string | null; difficulties?: string | null; decisions?: string | null; shared_notes?: string | null }) => {
      const { error } = await supabase.from('mentoring_sessions').update(v).eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['session', sessionId] }),
  })
}

export function useAddPrivateNote(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { content: string; sessionId?: string }) => {
      const { data: me } = await supabase.auth.getUser()
      const { error } = await supabase.from('mentoring_private_notes').insert({ student_id: studentId, session_id: v.sessionId ?? null, author_id: me.user!.id, content: v.content })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mentoring', 'private-notes', studentId] }),
  })
}

export function useAddActionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { sessionId: string; studentId: string; title: string; dueDate: string | null }) => {
      const { data: me } = await supabase.auth.getUser()
      const { error } = await supabase.from('mentoring_action_items').insert({ session_id: v.sessionId, student_id: v.studentId, title: v.title, due_date: v.dueDate, created_by: me.user?.id })
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useSetActionItemStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; status: Enums['action_item_status'] }) => {
      const { error } = await supabase.from('mentoring_action_items').update({ status: v.status }).eq('id', v.id)
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}
/** Back-compat for the dashboard checkbox. */
export function useCompleteActionItem() {
  const m = useSetActionItemStatus()
  return { ...m, mutate: (id: string, opts?: Parameters<typeof m.mutate>[1]) => m.mutate({ id, status: 'done' }, opts) }
}

export function useAttachSessionFiles(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (files: File[]) => {
      const stored = await Promise.all(files.map((f) => uploadFile('mentoring', sessionId, f)))
      const { error } = await supabase.rpc('add_session_files', { p_session: sessionId, p_files: stored as never })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['session', sessionId] }),
  })
}

export interface GoalInput { id?: string; ownerId: string; title: string; description: string | null; dimension: Enums['progress_dimension']; dueDate: string | null; status: Enums['goal_status']; progress: number; source: Enums['goal_source']; sessionId?: string | null }

export function useSaveGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (g: GoalInput) => {
      const { data: me } = await supabase.auth.getUser()
      const row = { title: g.title, description: g.description, dimension: g.dimension, due_date: g.dueDate, status: g.status, progress: g.status === 'done' ? 100 : g.progress }
      const { error } = g.id
        ? await supabase.from('goals').update(row).eq('id', g.id)
        : await supabase.from('goals').insert({ ...row, owner_id: g.ownerId, created_by: me.user?.id, source: g.source, session_id: g.sessionId ?? null })
      if (error) throw error
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useAssignMentor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { mentorId: string; studentId: string; focus: string }) => {
      const { data: me } = await supabase.auth.getUser()
      const { error } = await supabase.from('mentor_assignments').upsert(
        { mentor_id: v.mentorId, student_id: v.studentId, focus: v.focus || null, is_active: true, ended_on: null, assigned_by: me.user?.id },
        { onConflict: 'mentor_id,student_id' })
      if (error) throw error
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['mentoring'] }); void qc.invalidateQueries({ queryKey: ['cohort-students'] }) },
  })
}

export function useEndMentorAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mentor_assignments').update({ is_active: false, ended_on: new Date().toISOString().slice(0, 10) }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mentoring'] }),
  })
}

/** Active Neoleaders (for assignment dialogs). */
export function useNeoleaderOptions() {
  return useQuery({
    queryKey: ['neoleader-options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments')
        .select('cohort:cohorts(name), user:profiles!enrollments_user_id_fkey(id, full_name)').eq('status', 'active')
      if (error) throw error
      return data.filter((e) => e.user).map((e) => ({ id: e.user!.id, name: e.user!.full_name, cohort: e.cohort?.name ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}
