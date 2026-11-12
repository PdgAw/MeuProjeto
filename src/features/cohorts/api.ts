import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export function useCohortList() {
  return useQuery({
    queryKey: ['cohorts', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cohorts')
        .select('id, name, code, year, starts_on, ends_on, capacity, status, description, coordinator:profiles!cohorts_coordinator_id_fkey(id, full_name), enrollments(status)')
        .order('starts_on', { ascending: false })
      if (error) throw error
      return data.map((c) => ({ ...c, active: c.enrollments.filter((e) => e.status === 'active').length }))
    },
  })
}
export type CohortListItem = NonNullable<ReturnType<typeof useCohortList>['data']>[number]

export function useCohort(id: string | undefined) {
  return useQuery({
    queryKey: ['cohort', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('cohorts')
        .select('id, name, code, year, starts_on, ends_on, capacity, status, description, coordinator_id, coordinator:profiles!cohorts_coordinator_id_fkey(id, full_name), subject_cohorts(subject:subjects(id, name, code, status))')
        .eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useCohortStudents(id: string | undefined) {
  return useQuery({
    queryKey: ['cohort-students', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('cohort_students', { p_cohort: id! })
      if (error) throw error
      return data
    },
  })
}
export type CohortStudent = NonNullable<ReturnType<typeof useCohortStudents>['data']>[number]

export type CohortInput = Database['public']['Tables']['cohorts']['Insert']

export function useSaveCohort() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }: CohortInput) => {
      const { data, error } = id
        ? await supabase.from('cohorts').update(fields).eq('id', id).select('id').single()
        : await supabase.from('cohorts').insert(fields).select('id').single()
      if (error) throw new Error(error.code === '23505' ? 'Já existe uma turma com este código.' : error.message)
      return data.id
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ['cohorts'] })
      void qc.invalidateQueries({ queryKey: ['cohort', id] })
    },
  })
}

export const RISK_LABEL: Record<string, { one: string; many: string }> = {
  low_attendance: { one: 'aluno com frequência baixa', many: 'alunos com frequência baixa' },
  overdue_assignments: { one: 'aluno com entregas atrasadas', many: 'alunos com entregas atrasadas' },
  stale_venture: { one: 'aluno sem atualização do projeto há 30 dias', many: 'alunos sem atualização do projeto há 30 dias' },
  no_mentor: { one: 'aluno sem Neomentor', many: 'alunos sem Neomentor' },
  no_recent_mentoring: { one: 'aluno sem mentoria há 45 dias', many: 'alunos sem mentoria há 45 dias' },
  inactive: { one: 'aluno sem atividade há 3 semanas', many: 'alunos sem atividade há 3 semanas' },
}
export const RISK_SHORT: Record<string, string> = {
  low_attendance: 'Frequência', overdue_assignments: 'Entregas', stale_venture: 'Projeto parado',
  no_mentor: 'Sem mentor', no_recent_mentoring: 'Sem mentoria', inactive: 'Inativo',
}
