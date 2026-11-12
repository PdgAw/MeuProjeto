import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
        () => void qc.invalidateQueries({ queryKey: ['notifications'] }))
      .subscribe()
    return () => void supabase.removeChannel(channel)
  }, [userId, qc])

  return query.data ?? 0
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', 'list', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('id, type, title, body, link, read_at, created_at').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return data
    },
  })
}

export function useNotificationActions() {
  const qc = useQueryClient()
  const done = () => void qc.invalidateQueries({ queryKey: ['notifications'] })
  const read = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id); if (error) throw error }, onSuccess: done })
  const readAll = useMutation({ mutationFn: async () => { const { error } = await supabase.rpc('mark_all_notifications_read'); if (error) throw error }, onSuccess: done })
  return { read, readAll }
}
