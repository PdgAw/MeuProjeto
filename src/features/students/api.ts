import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ['student360', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [p, np, enr, mentors, venture, priv] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, job_title, company, status, last_seen_at, created_at').eq('id', id!).single(),
        supabase.from('neoleader_profiles').select('track, track_other_label, headline, goals').eq('user_id', id!).maybeSingle(),
        supabase.from('enrollments').select('id, status, enrolled_at, cohort:cohorts(id, name)').eq('user_id', id!).order('enrolled_at', { ascending: false }),
        supabase.from('mentor_assignments').select('id, focus, is_active, mentor:profiles!mentor_assignments_mentor_id_fkey(id, full_name)').eq('student_id', id!).eq('is_active', true),
        supabase.from('ventures').select('id, name, tagline, stage, segment, last_update_at').eq('owner_id', id!).eq('is_primary', true).maybeSingle(),
        supabase.from('profile_private').select('email, phone').eq('user_id', id!).maybeSingle(),
      ])
      if (p.error) throw p.error
      return { profile: p.data, neo: np.data, enrollments: enr.data ?? [], mentors: mentors.data ?? [], venture: venture.data, contact: priv.data }
    },
  })
}
export type Student = NonNullable<ReturnType<typeof useStudent>['data']>

export function useActivity(id: string | undefined) {
  return useQuery({
    queryKey: ['student360', 'activity', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_events').select('id, type, title, dimension, occurred_at, ref_table, ref_id').eq('user_id', id!).order('occurred_at', { ascending: false }).limit(200)
      if (error) throw error
      return data
    },
  })
}

export function useAcademic(id: string | undefined) {
  return useQuery({
    queryKey: ['student360', 'academic', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [att, subs] = await Promise.all([
        supabase.from('attendance').select('status, method, checked_in_at, lesson:lessons!inner(id, title, starts_at, subject:subjects(name))').eq('student_id', id!).order('updated_at', { ascending: false }).limit(300),
        supabase.from('assignment_submissions').select('id, status, submitted_at, score, assignment:assignments(id, title, due_at, max_score, subject:subjects(name))').eq('student_id', id!).order('submitted_at', { ascending: false, nullsFirst: false }),
      ])
      if (att.error) throw att.error
      if (subs.error) throw subs.error
      return { attendance: att.data.sort((a, b) => b.lesson.starts_at.localeCompare(a.lesson.starts_at)), submissions: subs.data }
    },
  })
}

export function useStudentExperiences(id: string | undefined) {
  return useQuery({
    queryKey: ['student360', 'experiences', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [regs, refl] = await Promise.all([
        supabase.from('experience_registrations').select('status, checked_in_at, experience:experiences(id, title, category, starts_at)').eq('user_id', id!),
        supabase.from('experience_reflections').select('experience_id, main_learning, application, rating').eq('user_id', id!),
      ])
      if (regs.error) throw regs.error
      if (refl.error) throw refl.error
      return regs.data.map((r) => ({ ...r, reflection: refl.data.find((x) => x.experience_id === r.experience?.id) ?? null }))
        .sort((a, b) => (b.experience?.starts_at ?? '').localeCompare(a.experience?.starts_at ?? ''))
    },
  })
}

export function useStudentDocuments(id: string | undefined) {
  return useQuery({
    queryKey: ['student360', 'documents', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [own, acks] = await Promise.all([
        supabase.from('documents').select('id, title, category, status, created_at').eq('owner_user_id', id!),
        supabase.from('document_acknowledgements').select('read_at, signed_at, document:documents(id, title, category, status)').eq('user_id', id!),
      ])
      if (own.error) throw own.error
      if (acks.error) throw acks.error
      return { own: own.data, acks: acks.data }
    },
  })
}

export function useSetEnrollmentStatus(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { enrollmentId: string; status: Database['public']['Enums']['enrollment_status'] }) => {
      const { error } = await supabase.from('enrollments').update({ status: v.status, completed_at: v.status === 'completed' ? new Date().toISOString() : null }).eq('id', v.enrollmentId)
      if (error) throw error
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['student360', studentId] }); void qc.invalidateQueries({ queryKey: ['management'] }) },
  })
}
