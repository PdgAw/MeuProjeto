import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { inviteUser } from '@/lib/invite'
import type { Database, Json } from '@/types/database'

type Enums = Database['public']['Enums']
export type AdmissionStatus = Enums['admission_status']
export type CandidateInsert = Database['public']['Tables']['candidates']['Insert']

export const ADMISSION_COLUMNS: { key: AdmissionStatus; label: string }[] = [
  { key: 'new_lead', label: 'Novo lead' },
  { key: 'application_received', label: 'Inscrição recebida' },
  { key: 'screening', label: 'Triagem' },
  { key: 'interview', label: 'Entrevista' },
  { key: 'committee', label: 'Comitê' },
  { key: 'approved', label: 'Aprovado' },
  { key: 'waitlist', label: 'Lista de espera' },
  { key: 'rejected', label: 'Não aprovado' },
  { key: 'enrolled', label: 'Matriculado' },
]
export const admissionLabel = (s: AdmissionStatus) => ADMISSION_COLUMNS.find((c) => c.key === s)?.label ?? s
export const RECOMMENDATION_LABEL: Record<Enums['interview_recommendation'], string> = { advance: 'Avançar', hold: 'Aguardar', reject: 'Não avançar' }
export const DECISION_LABEL: Record<Enums['committee_decision'], string> = { approve: 'Aprovar', waitlist: 'Lista de espera', reject: 'Não aprovar' }

export interface TemplateField { key: string; label: string; type: 'text' | 'textarea' | 'scale' | 'select' | 'boolean'; options?: string[]; required?: boolean; min?: number; max?: number }

export function useCandidates() {
  return useQuery({
    queryKey: ['admissions', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('candidates')
        .select('id, full_name, email, city, profile_type, status, lead_source, updated_at, created_at, target_cohort:cohorts(name), owner:profiles!candidates_owner_id_fkey(full_name)')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCandidate(id: string | undefined, committee: boolean) {
  return useQuery({
    queryKey: ['admissions', 'candidate', id, committee],
    enabled: Boolean(id),
    queryFn: async () => {
      const [c, hist, ints, revs, tpl] = await Promise.all([
        supabase.from('candidates').select('*, target_cohort:cohorts(id, name), owner:profiles!candidates_owner_id_fkey(id, full_name)').eq('id', id!).single(),
        supabase.from('candidate_status_history').select('id, from_status, to_status, changed_at, by:profiles!candidate_status_history_changed_by_fkey(full_name)').eq('candidate_id', id!).order('changed_at', { ascending: false }),
        supabase.from('candidate_interviews').select('*, interviewer:profiles!candidate_interviews_interviewer_id_fkey(full_name), template:interview_templates(name, fields)').eq('candidate_id', id!).order('created_at', { ascending: false }),
        committee ? supabase.from('committee_reviews').select('id, reviewer_id, score, decision, comment, created_at, reviewer:profiles!committee_reviews_reviewer_id_fkey(full_name)').eq('candidate_id', id!) : Promise.resolve({ data: [], error: null }),
        supabase.from('interview_templates').select('id, name, fields').eq('is_active', true).order('created_at'),
      ])
      if (c.error) throw c.error
      return {
        candidate: c.data, history: hist.data ?? [], interviews: ints.data ?? [], reviews: revs.data ?? [],
        templates: (tpl.data ?? []).map((t) => ({ ...t, fields: t.fields as unknown as TemplateField[] })),
      }
    },
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => { void qc.invalidateQueries({ queryKey: ['admissions'] }); void qc.invalidateQueries({ queryKey: ['management'] }) }
}

export function useSaveCandidate() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, ...v }: CandidateInsert & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from('candidates').update(v).eq('id', id)
        if (error) throw error
        return id
      }
      const { data, error } = await supabase.from('candidates').insert(v).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: inv,
  })
}

export function useMoveCandidate() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async ({ candidateId, status }: { candidateId: string; status: AdmissionStatus }) => {
      // The status trigger records the history row (who/when).
      const { error } = await supabase.from('candidates').update({ status }).eq('id', candidateId)
      if (error) throw error
    },
    onSuccess: inv,
  })
}

export function useSaveInterview() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (v: { id?: string; candidate_id: string; template_id: string | null; interviewer_id: string; answers: Record<string, unknown>; summary: string; recommendation: Enums['interview_recommendation'] | null; scheduled_at?: string | null; complete: boolean }) => {
      const row = { candidate_id: v.candidate_id, template_id: v.template_id, interviewer_id: v.interviewer_id, answers: v.answers as Json, summary: v.summary || null,
        recommendation: v.recommendation, scheduled_at: v.scheduled_at ?? null, completed_at: v.complete ? new Date().toISOString() : null }
      const { error } = v.id ? await supabase.from('candidate_interviews').update(row).eq('id', v.id) : await supabase.from('candidate_interviews').insert(row)
      if (error) throw error
    },
    onSuccess: inv,
  })
}

export function useSaveReview() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (v: { candidate_id: string; reviewer_id: string; score: number | null; decision: Enums['committee_decision']; comment: string }) => {
      const { error } = await supabase.from('committee_reviews').upsert({ ...v, comment: v.comment || null }, { onConflict: 'candidate_id,reviewer_id' })
      if (error) throw error
    },
    onSuccess: inv,
  })
}

export function useConvertCandidate() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (v: { candidate_id: string; email: string; full_name: string; cohort_id: string }) =>
      inviteUser({ email: v.email, full_name: v.full_name, role_key: 'neoleader', candidate_id: v.candidate_id, cohort_id: v.cohort_id }),
    onSuccess: inv,
  })
}

export function useCohortOptions() {
  return useQuery({
    queryKey: ['cohort-options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cohorts').select('id, name, status').in('status', ['active', 'planned']).order('starts_on', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}
