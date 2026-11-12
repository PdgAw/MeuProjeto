import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
export type PitchStatus = Database['public']['Enums']['pitch_status']
export type RoundStatus = Database['public']['Enums']['panel_round_status']

const inv = (qc: ReturnType<typeof useQueryClient>) => {
  for (const k of ['panel-rounds', 'panel-round', 'pitch', 'my-pitches', 'evaluations', 'pitch-results', 'journey']) void qc.invalidateQueries({ queryKey: [k] })
}

export function useRounds() {
  return useQuery({
    queryKey: ['panel-rounds'],
    queryFn: async () => {
      const { data, error } = await supabase.from('panel_rounds')
        .select('id, name, description, status, submissions_open_at, submissions_close_at, panel_date, location, panel_criteria(id), pitch_submissions(id, status)')
        .order('panel_date', { ascending: false, nullsFirst: true })
      if (error) throw error
      return data
    },
  })
}

const SUBMISSION = 'id, round_id, venture_id, submitted_by, status, problem, solution, market, business_model, traction, strategy, team, capital_needed, capital_use, pitch_deck_path, panel_at, submitted_at, updated_at, venture:ventures(id, name, tagline, stage, segment, pitch_deck_path, owner:profiles!ventures_owner_id_fkey(id, full_name, avatar_url))'

export function useRound(id: string | undefined) {
  return useQuery({
    queryKey: ['panel-round', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('panel_rounds')
        .select(`*, panel_criteria(id, name, description, weight, max_score, sort_order), panel_evaluators(user:profiles!panel_evaluators_user_id_fkey(id, full_name, avatar_url)), pitch_submissions(${SUBMISSION}, pitch_evaluations(evaluator_id, submitted_at))`)
        .eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}
export type RoundDetail = NonNullable<ReturnType<typeof useRound>['data']>
export type Criterion = RoundDetail['panel_criteria'][number]

export function useMyPitches(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-pitches', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('pitch_submissions')
        .select(`${SUBMISSION}, round:panel_rounds(id, name, status, panel_date, submissions_close_at)`)
        .eq('submitted_by', userId!).order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function usePitch(id: string | undefined) {
  return useQuery({
    queryKey: ['pitch', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('pitch_submissions')
        .select(`${SUBMISSION}, round:panel_rounds(id, name, status, panel_date, location, submissions_close_at, panel_criteria(id, name, description, weight, max_score, sort_order))`)
        .eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}
export type Pitch = NonNullable<ReturnType<typeof usePitch>['data']>

/** Submissions the caller must evaluate (evaluator rounds, RLS-scoped). */
export function useMyEvaluationQueue(userId: string | undefined) {
  return useQuery({
    queryKey: ['evaluations', 'queue', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data: rounds, error: e1 } = await supabase.from('panel_evaluators').select('round_id').eq('user_id', userId!)
      if (e1) throw e1
      const ids = rounds.map((r) => r.round_id)
      if (!ids.length) return []
      const { data, error } = await supabase.from('pitch_submissions')
        .select(`${SUBMISSION}, round:panel_rounds(id, name, panel_date), pitch_evaluations(evaluator_id, submitted_at)`)
        .in('round_id', ids).neq('status', 'draft').order('submitted_at')
      if (error) throw error
      return data.map((s) => ({ ...s, mine: s.pitch_evaluations.find((e) => e.evaluator_id === userId) ?? null }))
    },
  })
}

export function useMyEvaluation(submissionId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['evaluations', 'mine', submissionId, userId],
    enabled: Boolean(submissionId && userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('pitch_evaluations')
        .select('id, general_comment, submitted_at, pitch_scores(criterion_id, score, comment)')
        .eq('submission_id', submissionId!).eq('evaluator_id', userId!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Confidential (panels.results): weighted ranking + each evaluator's scores. */
export function usePitchResults(roundId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['pitch-results', roundId],
    enabled: Boolean(roundId) && enabled,
    queryFn: async () => {
      const [ranking, detail] = await Promise.all([
        supabase.rpc('pitch_results', { p_round: roundId! }),
        supabase.from('pitch_evaluations')
          .select('id, submission_id, general_comment, submitted_at, evaluator:profiles!pitch_evaluations_evaluator_id_fkey(full_name), pitch_scores(criterion_id, score, comment), submission:pitch_submissions!inner(round_id)')
          .eq('submission.round_id', roundId!),
      ])
      if (ranking.error) throw ranking.error
      if (detail.error) throw detail.error
      return { ranking: ranking.data, evaluations: detail.data }
    },
  })
}

// --------------------------------------------------------------- mutations ---
export type PitchFields = Pick<Tables['pitch_submissions']['Insert'], 'problem' | 'solution' | 'market' | 'business_model' | 'traction' | 'strategy' | 'team' | 'capital_needed' | 'capital_use'>

export function useSavePitch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id?: string; roundId: string; ventureId: string; userId: string; fields: PitchFields; deck?: File | null; submit: boolean }) => {
      const deckPath = v.deck ? (await uploadFile('ventures', v.ventureId, v.deck)).path : undefined
      const row = { ...v.fields, status: (v.submit ? 'submitted' : 'draft') as PitchStatus, ...(deckPath ? { pitch_deck_path: deckPath } : {}) }
      const { data, error } = v.id
        ? await supabase.from('pitch_submissions').update(row).eq('id', v.id).select('id').single()
        : await supabase.from('pitch_submissions').insert({ ...row, round_id: v.roundId, venture_id: v.ventureId, submitted_by: v.userId }).select('id').single()
      if (error) throw new Error(error.code === '23505' ? 'Seu negócio já tem um pitch nesta banca.' : error.message)
      return data.id
    },
    onSuccess: () => inv(qc),
  })
}

export function useSetPitchStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; status: PitchStatus; panelAt?: string | null }) => {
      const { error } = await supabase.from('pitch_submissions').update({ status: v.status, ...(v.panelAt !== undefined ? { panel_at: v.panelAt } : {}) }).eq('id', v.id)
      if (error) throw error
    },
    onSuccess: () => inv(qc),
  })
}

export function useSaveEvaluation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { submissionId: string; userId: string; comment: string; scores: { criterion_id: string; score: number; comment: string }[]; submit: boolean }) => {
      const { data: ev, error } = await supabase.from('pitch_evaluations').upsert(
        { submission_id: v.submissionId, evaluator_id: v.userId, general_comment: v.comment || null, submitted_at: v.submit ? new Date().toISOString() : null },
        { onConflict: 'submission_id,evaluator_id' }).select('id').single()
      if (error) throw error
      if (v.scores.length) {
        const { error: e2 } = await supabase.from('pitch_scores').upsert(v.scores.map((s) => ({ evaluation_id: ev.id, criterion_id: s.criterion_id, score: s.score, comment: s.comment || null })))
        if (e2) throw e2
      }
    },
    onSuccess: () => inv(qc),
  })
}

export function useSaveRound() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...f }: Tables['panel_rounds']['Insert']) => {
      const { data, error } = id
        ? await supabase.from('panel_rounds').update(f).eq('id', id).select('id').single()
        : await supabase.from('panel_rounds').insert(f).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => inv(qc),
  })
}

export function useSaveCriterion(roundId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id?: string; name: string; description?: string | null; weight: number; max_score: number; sort_order?: number; remove?: boolean }) => {
      if (v.remove && v.id) {
        const { error } = await supabase.from('panel_criteria').delete().eq('id', v.id)
        if (error) throw error
        return
      }
      const row = { name: v.name, description: v.description ?? null, weight: v.weight, max_score: v.max_score, sort_order: v.sort_order ?? 0 }
      const { error } = v.id ? await supabase.from('panel_criteria').update(row).eq('id', v.id) : await supabase.from('panel_criteria').insert({ ...row, round_id: roundId })
      if (error) throw error
    },
    onSuccess: () => inv(qc),
  })
}

export function useSetEvaluator(roundId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { userId: string; add: boolean }) => {
      const { error } = v.add
        ? await supabase.from('panel_evaluators').insert({ round_id: roundId, user_id: v.userId })
        : await supabase.from('panel_evaluators').delete().eq('round_id', roundId).eq('user_id', v.userId)
      if (error) throw error
    },
    onSuccess: () => inv(qc),
  })
}

/** People who can sit on a panel (teachers, mentors, staff). */
export function useEvaluatorCandidates() {
  return useQuery({
    queryKey: ['evaluator-candidates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles')
        .select('roles!inner(key, name), profile:profiles!user_roles_user_id_fkey(id, full_name)')
        .in('roles.key', ['teacher', 'mentor', 'coordinator', 'director', 'staff'])
      if (error) throw error
      const seen = new Map<string, { id: string; full_name: string; role: string }>()
      for (const r of data) if (r.profile && !seen.has(r.profile.id)) seen.set(r.profile.id, { ...r.profile, role: r.roles.name })
      return [...seen.values()].sort((a, b) => a.full_name.localeCompare(b.full_name))
    },
  })
}
