import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type AttendanceStatus = Database['public']['Enums']['attendance_status']

const LESSON_FIELDS = 'id, subject_id, cohort_id, title, description, starts_at, ends_at, lesson_type, modality, location, room, online_provider, meeting_url, teacher_id, guest_name, guest_title, status, checkin_open, subject:subjects(id, name, code), cohort:cohorts(id, name), teacher:profiles!lessons_teacher_id_fkey(id, full_name, avatar_url)'

export function useSubjectLessons(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['lessons', 'subject', subjectId],
    enabled: Boolean(subjectId),
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select(LESSON_FIELDS).eq('subject_id', subjectId!).order('starts_at')
      if (error) throw error
      return data
    },
  })
}
export type LessonRow = NonNullable<ReturnType<typeof useSubjectLessons>['data']>[number]

/** Lessons the teacher gives (own lessons or of subjects they teach). */
export function useTeacherLessons(userId: string | undefined, range: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ['lessons', 'teacher', userId, range.from.toISOString(), range.to.toISOString()],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data: subj } = await supabase.from('subject_teachers').select('subject_id').eq('user_id', userId!)
      const ids = (subj ?? []).map((s) => s.subject_id)
      let q = supabase.from('lessons').select(LESSON_FIELDS)
        .gte('starts_at', range.from.toISOString()).lte('starts_at', range.to.toISOString()).order('starts_at')
      q = ids.length ? q.or(`teacher_id.eq.${userId},subject_id.in.(${ids.join(',')})`) : q.eq('teacher_id', userId!)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

/** All lessons (management) in a time range. */
export function useLessonsInRange(range: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ['lessons', 'range', range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select(LESSON_FIELDS)
        .gte('starts_at', range.from.toISOString()).lte('starts_at', range.to.toISOString()).order('starts_at')
      if (error) throw error
      return data
    },
  })
}

export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: ['lesson', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select(LESSON_FIELDS).eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Cohort students + their attendance for a lesson (teacher/staff view; RLS-scoped). */
export function useLessonRoster(lessonId: string | undefined, cohortId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['lesson-roster', lessonId],
    enabled: Boolean(lessonId && cohortId) && enabled,
    queryFn: async () => {
      const [students, att] = await Promise.all([
        supabase.from('enrollments').select('user:profiles!enrollments_user_id_fkey(id, full_name, avatar_url)')
          .eq('cohort_id', cohortId!).in('status', ['active', 'paused']),
        supabase.from('attendance').select('student_id, status, method, checked_in_at').eq('lesson_id', lessonId!),
      ])
      if (students.error) throw students.error
      if (att.error) throw att.error
      const byStudent = new Map(att.data.map((a) => [a.student_id, a]))
      return students.data
        .map((e) => e.user)
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .map((u) => ({ ...u, attendance: byStudent.get(u.id) ?? null }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
    },
  })
}
export type RosterRow = NonNullable<ReturnType<typeof useLessonRoster>['data']>[number]

export function useMyAttendance(lessonId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'mine', lessonId, userId],
    enabled: Boolean(lessonId && userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('status, method, checked_in_at')
        .eq('lesson_id', lessonId!).eq('student_id', userId!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSetAttendance(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rows: { student_id: string; status: AttendanceStatus }[]) => {
      const { data: me } = await supabase.auth.getUser()
      const { error } = await supabase.from('attendance').upsert(
        rows.map((r) => ({ lesson_id: lessonId, student_id: r.student_id, status: r.status, method: 'manual' as const, recorded_by: me.user?.id })),
      )
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lesson-roster', lessonId] })
      void qc.invalidateQueries({ queryKey: ['subject-results'] })
    },
  })
}

export type LessonInput = Omit<Tables['lessons']['Insert'], 'created_by'>

export function useSaveLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }: LessonInput) => {
      const { data, error } = id
        ? await supabase.from('lessons').update(fields).eq('id', id).select('id').single()
        : await supabase.from('lessons').insert(fields).select('id').single()
      if (error) throw new Error(error.message.includes('row-level security') ? 'Sem permissão para esta disciplina.' : error.message)
      return data.id
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ['lessons'] })
      void qc.invalidateQueries({ queryKey: ['lesson', id] })
      void qc.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}

export function useUpdateLesson(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fields: Tables['lessons']['Update']) => {
      const { error } = await supabase.from('lessons').update(fields).eq('id', lessonId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lesson', lessonId] })
      void qc.invalidateQueries({ queryKey: ['lessons'] })
    },
  })
}

/** The signed-in Neoleader's attendance across a set of lessons. */
export function useMyAttendanceMap(lessonIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'mine-map', userId, lessonIds.join(',')],
    enabled: Boolean(userId) && lessonIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('lesson_id, status').eq('student_id', userId!).in('lesson_id', lessonIds)
      if (error) throw error
      return new Map(data.map((a) => [a.lesson_id, a.status]))
    },
  })
}
