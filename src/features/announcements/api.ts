import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Latest announcements for the user (RLS already filters by audience), pinned first. */
export function useLatestAnnouncements(userId: string | undefined, limit = 4) {
  return useQuery({
    queryKey: ['announcements', 'latest', userId, limit],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, type, is_pinned, requires_ack, publish_at, announcement_reads(user_id, read_at)')
        .eq('status', 'published')
        .lte('publish_at', new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('publish_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data.map((a) => ({ ...a, isRead: a.announcement_reads.some((r) => r.user_id === userId) }))
    },
  })
}
