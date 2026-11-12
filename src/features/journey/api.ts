import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { JourneyStatus } from '@/config/labels'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export interface Requirement { label: string; type: string; met: boolean }

export function useJourney(studentId?: string) {
  return useQuery({
    queryKey: ['journey', studentId ?? 'me'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('student_journey', studentId ? { p_student: studentId } : {})
      if (error) throw error
      return data.map((i) => ({
        ...i,
        status: i.status as JourneyStatus,
        requirements: (i.requirements as unknown as Requirement[]) ?? [],
      }))
    },
  })
}
export type JourneyItem = NonNullable<ReturnType<typeof useJourney>['data']>[number]

export function journeySummary(items: JourneyItem[] | undefined) {
  const list = items ?? []
  const done = list.filter((i) => i.status === 'completed').length
  // "Seu próximo nível": the first configured step not completed yet (falls back to any next item).
  const next =
    list.find((i) => i.source === 'journey_milestone' && i.status !== 'completed' && i.requirements.length > 0) ??
    list.find((i) => i.status === 'in_progress' || i.status === 'upcoming' || i.status === 'blocked') ??
    null
  return { total: list.length, done, percent: list.length ? Math.round((100 * done) / list.length) : 0, next }
}

type CheckpointStatus = Database['public']['Enums']['checkpoint_status']
type Track = Database['public']['Enums']['neoleader_track']

/** Track checkpoints (ideia → escala / empresa familiar → plano estratégico) with the user's status. */
export function useTrackCheckpoints(userId: string | undefined, track: Track | null | undefined) {
  return useQuery({
    queryKey: ['track-checkpoints', userId, track],
    enabled: Boolean(userId && track),
    queryFn: async () => {
      const [defs, mine] = await Promise.all([
        supabase.from('track_checkpoints').select('id, key, title, description, sort_order')
          .eq('track', track!).eq('is_active', true).order('sort_order'),
        supabase.from('neoleader_checkpoints').select('checkpoint_id, status, completed_at').eq('user_id', userId!),
      ])
      if (defs.error) throw defs.error
      if (mine.error) throw mine.error
      const byId = new Map(mine.data.map((m) => [m.checkpoint_id, m]))
      return defs.data.map((d) => ({
        ...d,
        status: (byId.get(d.id)?.status ?? 'not_started') as CheckpointStatus,
        completed_at: byId.get(d.id)?.completed_at ?? null,
      }))
    },
  })
}

export function useSetCheckpointStatus(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ checkpointId, status }: { checkpointId: string; status: CheckpointStatus }) => {
      const { error } = await supabase.from('neoleader_checkpoints').upsert({
        user_id: userId!, checkpoint_id: checkpointId, status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['track-checkpoints', userId] })
      void qc.invalidateQueries({ queryKey: ['journey'] })
      void qc.invalidateQueries({ queryKey: ['neo-progress'] })
    },
  })
}
