import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']

const refresh = (qc: ReturnType<typeof useQueryClient>, ventureId?: string) => {
  void qc.invalidateQueries({ queryKey: ['venture', ventureId] })
  void qc.invalidateQueries({ queryKey: ['ventures'] })
  void qc.invalidateQueries({ queryKey: ['neo-progress'] })
  void qc.invalidateQueries({ queryKey: ['journey'] })
}

export function usePrimaryVenture(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['ventures', 'primary', ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase.from('ventures')
        .select('id, name, tagline, segment, stage, logo_url, last_update_at, venture_milestones(id, title, status, sort_order)')
        .eq('owner_id', ownerId!).eq('is_primary', true).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

const VENTURE_DETAIL = `*, owner:profiles!ventures_owner_id_fkey(id, full_name, avatar_url),
  venture_stage_history(id, from_stage, to_stage, changed_at),
  venture_kpis(id, definition_id, custom_name, unit, target_value, is_active, sort_order, definition:kpi_definitions(key, name, unit, higher_is_better), venture_kpi_values(id, period_start, value, note)),
  venture_milestones(id, template_id, title, description, target_date, status, achieved_at, evidence_url, sort_order),
  venture_objectives(id, title, description, period_label, due_date, status, sort_order, venture_key_results(id, title, unit, start_value, target_value, current_value, sort_order)),
  venture_actions(id, objective_id, key_result_id, title, owner_id, owner_name, due_date, status, completed_at, sort_order),
  venture_comments(id, objective_id, action_id, body, created_at, edited_at, author:profiles!venture_comments_author_id_fkey(id, full_name, avatar_url))`

export function useVenture(id: string | undefined) {
  return useQuery({
    queryKey: ['venture', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('ventures').select(VENTURE_DETAIL).eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}
export type VentureDetail = NonNullable<ReturnType<typeof useVenture>['data']>
export type VentureKpi = VentureDetail['venture_kpis'][number]
export type Objective = VentureDetail['venture_objectives'][number]
export type VentureAction = VentureDetail['venture_actions'][number]
export type VentureComment = VentureDetail['venture_comments'][number]

/** Management: every venture visible to the caller. */
export function useVentureList() {
  return useQuery({
    queryKey: ['ventures', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ventures')
        .select('id, name, tagline, segment, stage, last_update_at, visibility, owner:profiles!ventures_owner_id_fkey(id, full_name, avatar_url), venture_milestones(status)')
        .eq('is_primary', true).order('last_update_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useKpiDefinitions() {
  return useQuery({
    queryKey: ['kpi-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_definitions').select('id, key, name, unit, higher_is_better').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useMilestoneTemplates(track: Enums['neoleader_track'] | null | undefined) {
  return useQuery({
    queryKey: ['milestone-templates', track],
    queryFn: async () => {
      let q = supabase.from('milestone_templates').select('id, title, description, stage, track, sort_order').eq('is_active', true).order('sort_order')
      if (track) q = q.or(`track.eq.${track},track.is.null`)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useFamilyBusiness(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['family-business', ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase.from('family_businesses').select('*').eq('owner_id', ownerId!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// --------------------------------------------------------------- mutations ---
export function useSaveVenture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }: Tables['ventures']['Insert']) => {
      const { data, error } = id
        ? await supabase.from('ventures').update(fields).eq('id', id).select('id').single()
        : await supabase.from('ventures').insert(fields).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: (id) => refresh(qc, id),
  })
}

export function useUploadPitchDeck(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const stored = await uploadFile('ventures', ventureId, file)
      const { error } = await supabase.from('ventures').update({ pitch_deck_path: stored.path }).eq('id', ventureId)
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useSaveFamilyBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: Tables['family_businesses']['Insert']) => {
      const { error } = await supabase.from('family_businesses').upsert(row, { onConflict: 'owner_id' })
      if (error) throw error
    },
    onSuccess: (_, v) => void qc.invalidateQueries({ queryKey: ['family-business', v.owner_id] }),
  })
}

export function useAddKpi(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { definitionId?: string; customName?: string; unit: Enums['kpi_unit']; target: number | null }) => {
      const { error } = await supabase.from('venture_kpis').insert({ venture_id: ventureId, definition_id: v.definitionId ?? null, custom_name: v.customName ?? null, unit: v.unit, target_value: v.target })
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useRemoveKpi(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (kpiId: string) => {
      const { error } = await supabase.from('venture_kpis').update({ is_active: false }).eq('id', kpiId)
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useRecordKpiValue(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { kpiId: string; period: string; value: number; note: string | null }) => {
      const { data: me } = await supabase.auth.getUser()
      const { error } = await supabase.from('venture_kpi_values').upsert(
        { venture_kpi_id: v.kpiId, period_start: v.period, value: v.value, note: v.note, recorded_by: me.user?.id },
        { onConflict: 'venture_kpi_id,period_start' })
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useAddMilestones(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rows: { title: string; template_id?: string | null; target_date?: string | null; sort_order?: number }[]) => {
      const { error } = await supabase.from('venture_milestones').insert(rows.map((r) => ({ ...r, venture_id: ventureId })))
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useSetMilestoneStatus(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; status: Enums['milestone_status'] }) => {
      const { error } = await supabase.from('venture_milestones').update({ status: v.status }).eq('id', v.id)
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useDeleteRow(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { table: 'venture_milestones' | 'venture_objectives' | 'venture_actions' | 'venture_key_results' | 'venture_comments'; id: string }) => {
      const { error } = await supabase.from(v.table).delete().eq('id', v.id)
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useSaveObjective(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...f }: Partial<Tables['venture_objectives']['Insert']> & { title: string }) => {
      const { error } = id
        ? await supabase.from('venture_objectives').update(f).eq('id', id)
        : await supabase.from('venture_objectives').insert({ ...f, venture_id: ventureId })
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useSaveKeyResult(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...f }: Partial<Tables['venture_key_results']['Insert']> & { objective_id: string; title: string; target_value: number }) => {
      const { error } = id
        ? await supabase.from('venture_key_results').update(f).eq('id', id)
        : await supabase.from('venture_key_results').insert(f)
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useSaveAction(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...f }: Partial<Tables['venture_actions']['Insert']> & { title?: string }) => {
      const { error } = id
        ? await supabase.from('venture_actions').update(f).eq('id', id)
        : await supabase.from('venture_actions').insert({ ...f, title: f.title!, venture_id: ventureId })
      if (error) throw error
    },
    onSuccess: () => refresh(qc, ventureId),
  })
}

export function useAddComment(ventureId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { body: string; objectiveId?: string | null; actionId?: string | null }) => {
      const { data: me } = await supabase.auth.getUser()
      const { error } = await supabase.from('venture_comments').insert({ venture_id: ventureId, objective_id: v.objectiveId ?? null, action_id: v.actionId ?? null, author_id: me.user!.id, body: v.body })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['venture', ventureId] }),
  })
}
