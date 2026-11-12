import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useUpcomingMentorings(userId: string | undefined, limit = 3) {
  return useQuery({
    queryKey: ['mentoring', 'upcoming', userId, limit],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentoring_sessions')
        .select('id, scheduled_at, duration_min, modality, location, meeting_url, topics, status, mentor:profiles!mentoring_sessions_mentor_id_fkey(id, full_name, avatar_url, job_title)')
        .eq('student_id', userId!)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date(Date.now() - 60 * 60_000).toISOString())
        .order('scheduled_at')
        .limit(limit)
      if (error) throw error
      return data
    },
  })
}

/** "Próximos passos" from mentoring sessions that are still open. */
export function useOpenActionItems(userId: string | undefined) {
  return useQuery({
    queryKey: ['mentoring', 'action-items', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentoring_action_items')
        .select('id, title, due_date, status')
        .eq('student_id', userId!)
        .eq('status', 'open')
        .order('due_date', { nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

export function useCompleteActionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mentoring_action_items').update({ status: 'done' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mentoring', 'action-items'] })
      void qc.invalidateQueries({ queryKey: ['neo-progress'] })
    },
  })
}
