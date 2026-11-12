import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function usePrimaryVenture(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['ventures', 'primary', ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventures')
        .select('id, name, tagline, segment, stage, logo_url, last_update_at, venture_milestones(id, title, status, sort_order)')
        .eq('owner_id', ownerId!)
        .eq('is_primary', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
