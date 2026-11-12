import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Stage = Database['public']['Enums']['venture_stage']

export function useDirectory(f: { search?: string; kind?: string; cohort?: string; stage?: Stage }) {
  return useQuery({
    queryKey: ['directory', f],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_directory', {
        p_search: f.search || undefined, p_kind: f.kind || undefined, p_cohort: f.cohort || undefined, p_stage: f.stage || undefined,
      })
      if (error) throw error
      return data
    },
  })
}
export type Person = NonNullable<ReturnType<typeof useDirectory>['data']>[number]

export function useConnections(userId: string | undefined) {
  return useQuery({
    queryKey: ['connections', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('connections')
        .select('id, requester_id, addressee_id, status, message, created_at, requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url, job_title), addressee:profiles!connections_addressee_id_fkey(id, full_name, avatar_url, job_title)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map((c) => ({ ...c, other: c.requester_id === userId ? c.addressee : c.requester, incoming: c.addressee_id === userId }))
    },
  })
}
export type Connection = NonNullable<ReturnType<typeof useConnections>['data']>[number]

export function useConnectionActions() {
  const qc = useQueryClient()
  const done = () => { void qc.invalidateQueries({ queryKey: ['connections'] }); void qc.invalidateQueries({ queryKey: ['achievements'] }) }
  const request = useMutation({
    mutationFn: async (v: { me: string; to: string; message: string }) => {
      const { error } = await supabase.from('connections').insert({ requester_id: v.me, addressee_id: v.to, message: v.message || null })
      if (error) throw new Error(error.code === '23505' ? 'Já existe um pedido de conexão entre vocês.' : error.message)
    },
    onSuccess: done,
  })
  const respond = useMutation({
    mutationFn: async (v: { id: string; accept: boolean }) => {
      const { error } = await supabase.from('connections').update({ status: v.accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() }).eq('id', v.id)
      if (error) throw error
    },
    onSuccess: done,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('connections').delete().eq('id', id); if (error) throw error },
    onSuccess: done,
  })
  return { request, respond, remove }
}
