import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export const notificationKeys = { unread: (uid: string) => ['notifications', 'unread', uid] as const }

/** Unread count, kept live through Supabase Realtime. */
export function useUnreadNotifications(userId: string | undefined) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: notificationKeys.unread(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
      if (error) throw error
      return count ?? 0
    },
  })

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => void qc.invalidateQueries({ queryKey: notificationKeys.unread(userId) }))
      .subscribe()
    return () => void supabase.removeChannel(channel)
  }, [userId, qc])

  return query.data ?? 0
}
