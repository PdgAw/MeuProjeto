import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Documents that need the user's action: mandatory reading or signature, not yet acknowledged. */
export function usePendingDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ['documents', 'pending', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, status, category, document_acknowledgements(user_id, read_at, signed_at)')
        .in('status', ['required_reading', 'signature_pending'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.filter((d) => {
        const ack = d.document_acknowledgements.find((a) => a.user_id === userId)
        return d.status === 'signature_pending' ? !ack?.signed_at : !ack?.read_at
      })
    },
  })
}
