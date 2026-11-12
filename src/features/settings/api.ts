import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type Editable = 'progress_dimension_settings' | 'track_checkpoints' | 'milestone_templates' | 'kpi_definitions'

export function useSettingsData() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const [dims, cps, ms, kpis] = await Promise.all([
        supabase.from('progress_dimension_settings').select('*').order('sort_order'),
        supabase.from('track_checkpoints').select('*').order('track').order('sort_order'),
        supabase.from('milestone_templates').select('*').order('sort_order'),
        supabase.from('kpi_definitions').select('*').order('is_system', { ascending: false }).order('name'),
      ])
      for (const r of [dims, cps, ms, kpis]) if (r.error) throw r.error
      return { dims: dims.data!, checkpoints: cps.data!, milestones: ms.data!, kpis: kpis.data! }
    },
  })
}

/** Upsert/update one row of a settings table (RLS: settings.manage). */
export function useSaveRow<T extends Editable>(table: T) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ match, values }: { match?: Partial<Tables[T]['Row']>; values: Tables[T]['Insert'] | Tables[T]['Update'] }) => {
      // Generic over the table name; the payload type is checked at the call site.
      const t = supabase.from(table) as unknown as { update: (v: unknown) => { match: (m: unknown) => Promise<{ error: Error | null }> }; insert: (v: unknown) => Promise<{ error: Error | null }> }
      const { error } = match ? await t.update(values).match(match) : await t.insert(values)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}
