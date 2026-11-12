import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ProfLink { label: string; url: string }

/** Teachers with their professional profile and subjects. */
export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles')
        .select('roles!inner(key), profile:profiles!user_roles_user_id_fkey(id, full_name, avatar_url, job_title, company, status, professional_profiles(headline, company, position, specialties, is_guest), subject_teachers(role, subject:subjects(id, name, status)))')
        .eq('roles.key', 'teacher')
      if (error) throw error
      return data.map((r) => r.profile).filter((p): p is NonNullable<typeof p> => Boolean(p)).sort((a, b) => a.full_name.localeCompare(b.full_name))
    },
  })
}

export function useProfessional(id: string | undefined) {
  return useQuery({
    queryKey: ['professional', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles')
        .select('id, full_name, avatar_url, job_title, company, professional_profiles(headline, company, position, specialties, areas, bio, links, is_guest), subject_teachers(role, subject:subjects(id, name, code, status)), user_roles!user_roles_user_id_fkey(role:roles(key, name))')
        .eq('id', id!).maybeSingle()
      if (error) throw error
      if (!data) return null
      const pp = data.professional_profiles
      return { ...data, pro: pp ? { ...pp, links: (pp.links as unknown as ProfLink[]) ?? [] } : null }
    },
  })
}
export type Professional = NonNullable<NonNullable<ReturnType<typeof useProfessional>['data']>>

export function useUpcomingLessonsOf(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['lessons', 'of-teacher', teacherId],
    enabled: Boolean(teacherId),
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('id, title, starts_at, subject:subjects(name), cohort:cohorts(name)')
        .eq('teacher_id', teacherId!).gte('starts_at', new Date().toISOString()).order('starts_at').limit(5)
      if (error) throw error
      return data
    },
  })
}

export interface ProfessionalInput {
  userId: string; headline: string; company: string; position: string; bio: string
  specialties: string[]; areas: string[]; links: ProfLink[]; is_guest: boolean
}

export function useSaveProfessional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, ...p }: ProfessionalInput) => {
      const { error } = await supabase.from('professional_profiles').upsert({
        user_id: userId, headline: p.headline || null, company: p.company || null, position: p.position || null,
        bio: p.bio || null, specialties: p.specialties, areas: p.areas, links: p.links as never, is_guest: p.is_guest,
      })
      if (error) throw error
    },
    onSuccess: (_, v) => {
      void qc.invalidateQueries({ queryKey: ['professional', v.userId] })
      void qc.invalidateQueries({ queryKey: ['teachers'] })
    },
  })
}
