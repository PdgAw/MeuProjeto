import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Enums = Database['public']['Enums']

export interface Overview {
  neoleaders_active: number; cohorts_active: number; lessons_week: number; mentorings_week: number; events_upcoming: number
  attendance_rate: number | null; overdue_deliveries: number; ventures_active: number
  mentorings_overdue: { user_id: string; full_name: string; session_id: string; scheduled_at: string }[]
  documents_pending: { user_id: string; full_name: string }[]
}
export function useOverview(cohortId?: string) {
  return useQuery({
    queryKey: ['management', 'overview', cohortId ?? 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('management_overview', cohortId ? { p_cohort: cohortId } : {})
      if (error) throw error
      return data as unknown as Overview
    },
  })
}

/** Every Neoleader of every non-archived cohort, with risk flags (cohort_students per cohort). */
export function useAllStudents() {
  return useQuery({
    queryKey: ['management', 'all-students'],
    queryFn: async () => {
      const { data: cohorts, error } = await supabase.from('cohorts').select('id, name').in('status', ['active', 'planned']).order('name')
      if (error) throw error
      const rows = await Promise.all(cohorts.map(async (c) => {
        const { data, error: e } = await supabase.rpc('cohort_students', { p_cohort: c.id })
        if (e) throw e
        return data.map((s) => ({ ...s, cohort_id: c.id, cohort_name: c.name }))
      }))
      return rows.flat()
    },
  })
}
export type StudentInsight = NonNullable<ReturnType<typeof useAllStudents>['data']>[number]

export interface Executive {
  neoleaders: number; admissions_new: number; admissions_enrolled: number; retention_rate: number | null; engagement_rate: number | null
  attendance_rate: number | null; mentorings_done: number; ventures_active: number; ventures_by_stage: Record<string, number>
  experiences_held: number; satisfaction: number | null; satisfaction_responses: number; cohorts_active: number; teachers: number; mentors: number
  monthly: { month: string; mentorings: number; attendance: number | null }[]
}
export function useExecutive(f: { from: Date; to: Date; cohort?: string; track?: Enums['neoleader_track'] | ''; status?: Enums['enrollment_status'] | '' }) {
  return useQuery({
    queryKey: ['management', 'executive', f.from.toISOString().slice(0, 10), f.to.toISOString().slice(0, 10), f.cohort, f.track, f.status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('executive_kpis', {
        p_from: f.from.toISOString(), p_to: f.to.toISOString(), p_cohort: f.cohort || undefined,
        p_track: (f.track || undefined) as Enums['neoleader_track'] | undefined, p_status: (f.status || undefined) as Enums['enrollment_status'] | undefined,
      })
      if (error) throw error
      return data as unknown as Executive
    },
  })
}

export function useAdmissionsFunnel(enabled: boolean) {
  return useQuery({
    queryKey: ['management', 'admissions-funnel'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('candidates').select('status')
      if (error) throw error
      return data.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {})
    },
  })
}

export const RISK_ALERTS: Record<string, { one: string; many: string }> = {
  low_attendance: { one: 'aluno com frequência baixa', many: 'alunos com frequência baixa' },
  overdue_assignments: { one: 'aluno com entregas atrasadas', many: 'alunos com entregas atrasadas' },
  stale_venture: { one: 'aluno sem atualização do projeto há 30 dias', many: 'alunos sem atualização do projeto há 30 dias' },
  no_mentor: { one: 'aluno sem Neomentor', many: 'alunos sem Neomentor' },
  no_recent_mentoring: { one: 'aluno sem mentoria há 45 dias', many: 'alunos sem mentoria há 45 dias' },
  inactive: { one: 'aluno sem atividade há 3 semanas', many: 'alunos sem atividade há 3 semanas' },
}

// ---- Secretaria ----
export function useSecretaryQueue() {
  return useQuery({
    queryKey: ['management', 'secretary'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const [requests, candidates, installments, enrollments] = await Promise.all([
        supabase.from('service_requests').select('id, subject, type, status, priority, created_at, requester:profiles!service_requests_requester_id_fkey(full_name)').in('status', ['open', 'in_review']).order('created_at').limit(8),
        supabase.from('candidates').select('id, full_name, status, created_at').in('status', ['new_lead', 'application_received', 'approved']).order('created_at', { ascending: false }).limit(8),
        supabase.from('tuition_installments').select('id, number, due_date, amount, status, agreement:financial_agreements!inner(id, student:profiles!financial_agreements_student_id_fkey(full_name))').in('status', ['pending', 'overdue']).lt('due_date', today).order('due_date').limit(10),
        supabase.from('enrollments').select('id, enrolled_at, status, user:profiles!enrollments_user_id_fkey(id, full_name), cohort:cohorts(name)').order('enrolled_at', { ascending: false }).limit(6),
      ])
      for (const r of [requests, candidates, installments, enrollments]) if (r.error) throw r.error
      return { requests: requests.data!, candidates: candidates.data!, installments: installments.data!, enrollments: enrollments.data! }
    },
  })
}

export function useMarkInstallment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; status: Enums['installment_status']; method?: string }) => {
      const { error } = await supabase.from('tuition_installments').update({ status: v.status, paid_at: v.status === 'paid' ? new Date().toISOString() : null, payment_method: v.method ?? null }).eq('id', v.id)
      if (error) throw error
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['management'] }); void qc.invalidateQueries({ queryKey: ['finance'] }) },
  })
}
