import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFile, type StoredFile } from '@/lib/storage'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

export function useSubjectAssignments(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['assignments', 'subject', subjectId],
    enabled: Boolean(subjectId),
    queryFn: async () => {
      const { data, error } = await supabase.from('assignments')
        .select('id, title, instructions, due_at, status, max_score, dimension, cohort_id, assignment_submissions(id, student_id, status, score)')
        .eq('subject_id', subjectId!).order('due_at', { nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

export function useAssignment(id: string | undefined) {
  return useQuery({
    queryKey: ['assignment', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('assignments')
        .select('id, subject_id, title, instructions, due_at, status, max_score, dimension, cohort_id, lesson_id, subject:subjects(id, name, code)')
        .eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useMySubmission(assignmentId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['submission', assignmentId, userId],
    enabled: Boolean(assignmentId && userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('assignment_submissions')
        .select('id, content, link_url, files, status, submitted_at, score, feedback, reviewed_at')
        .eq('assignment_id', assignmentId!).eq('student_id', userId!).maybeSingle()
      if (error) throw error
      return data ? { ...data, files: (data.files as unknown as StoredFile[]) ?? [] } : null
    },
  })
}

/** All submissions of an assignment (teacher view). */
export function useSubmissions(assignmentId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['submissions', assignmentId],
    enabled: Boolean(assignmentId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('assignment_submissions')
        .select('id, student_id, content, link_url, files, status, submitted_at, score, feedback, reviewed_at, student:profiles!assignment_submissions_student_id_fkey(full_name, avatar_url)')
        .eq('assignment_id', assignmentId!).neq('status', 'draft').order('submitted_at')
      if (error) throw error
      return data.map((s) => ({ ...s, files: (s.files as unknown as StoredFile[]) ?? [] }))
    },
  })
}
export type Submission = NonNullable<ReturnType<typeof useSubmissions>['data']>[number]

export function useSubmitAssignment(assignmentId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { content: string; link_url: string; newFiles: File[]; keepFiles: StoredFile[]; final: boolean }) => {
      const uploaded = await Promise.all(input.newFiles.map((f) => uploadFile('submissions', `${assignmentId}/${userId}`, f)))
      const { error } = await supabase.from('assignment_submissions').upsert(
        {
          assignment_id: assignmentId,
          student_id: userId,
          content: input.content || null,
          link_url: input.link_url || null,
          files: [...input.keepFiles, ...uploaded] as unknown as Tables['assignment_submissions']['Insert']['files'],
          status: input.final ? 'submitted' : 'draft',
        },
        { onConflict: 'assignment_id,student_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['submission', assignmentId] })
      void qc.invalidateQueries({ queryKey: ['assignments'] })
      void qc.invalidateQueries({ queryKey: ['neo-progress'] })
    },
  })
}

export function useReviewSubmission(assignmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; score: number | null; feedback: string; returnToStudent: boolean }) => {
      const { data: me } = await supabase.auth.getUser()
      const { error } = await supabase.from('assignment_submissions').update({
        score: input.score, feedback: input.feedback || null,
        status: input.returnToStudent ? 'returned' : 'reviewed',
        reviewed_by: me.user?.id, reviewed_at: new Date().toISOString(),
      }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['submissions', assignmentId] }),
  })
}

export type AssignmentInput = Omit<Tables['assignments']['Insert'], 'created_by'>

export function useSaveAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }: AssignmentInput) => {
      const { error } = id
        ? await supabase.from('assignments').update(fields).eq('id', id)
        : await supabase.from('assignments').insert(fields)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assignments'] }),
  })
}

/** Submissions waiting for the teacher's review (RLS limits to subjects they teach). */
export function usePendingReviews(enabled: boolean) {
  return useQuery({
    queryKey: ['submissions', 'pending-review'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('assignment_submissions')
        .select('id, submitted_at, status, assignment:assignments!inner(id, title, subject:subjects(name)), student:profiles!assignment_submissions_student_id_fkey(full_name)')
        .in('status', ['submitted', 'late']).order('submitted_at').limit(20)
      if (error) throw error
      return data
    },
  })
}
