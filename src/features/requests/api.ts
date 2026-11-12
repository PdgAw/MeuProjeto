import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFile, type StoredFile } from '@/lib/storage'
import type { Database, Json } from '@/types/database'

type Enums = Database['public']['Enums']
export type RequestStatus = Enums['request_status']
export type RequestType = Enums['request_type']

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  document: 'Documento', declaration: 'Declaração', profile_change: 'Alteração cadastral', support: 'Suporte', academic_issue: 'Questão acadêmica', other: 'Outro',
}
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: 'Aberta', in_review: 'Em análise', awaiting_user: 'Aguardando você', resolved: 'Resolvida', canceled: 'Cancelada',
}
export const STAFF_STATUS_LABEL: Record<RequestStatus, string> = { ...REQUEST_STATUS_LABEL, awaiting_user: 'Aguardando solicitante' }
export const PRIORITY_LABEL: Record<string, string> = { low: 'Baixa', normal: 'Normal', high: 'Alta' }

const LIST_COLS = 'id, type, subject, status, priority, created_at, updated_at, resolved_at, requester:profiles!service_requests_requester_id_fkey(id, full_name, avatar_url), assignee:profiles!service_requests_assigned_to_fkey(id, full_name)'

export function useRequests(scope: 'mine' | 'all', userId?: string) {
  return useQuery({
    queryKey: ['requests', scope, userId],
    enabled: scope === 'all' || Boolean(userId),
    queryFn: async () => {
      let q = supabase.from('service_requests').select(LIST_COLS).order('updated_at', { ascending: false })
      if (scope === 'mine') q = q.eq('requester_id', userId!)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}
export type RequestRow = NonNullable<ReturnType<typeof useRequests>['data']>[number]

export function useRequest(id: string | null) {
  return useQuery({
    queryKey: ['requests', 'one', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [r, c] = await Promise.all([
        supabase.from('service_requests').select(`${LIST_COLS}, description, assigned_to, requester_id`).eq('id', id!).single(),
        supabase.from('service_request_comments').select('id, body, is_internal, attachments, created_at, author:profiles!service_request_comments_author_id_fkey(id, full_name, avatar_url)').eq('request_id', id!).order('created_at'),
      ])
      if (r.error) throw r.error
      if (c.error) throw c.error
      return { request: r.data, comments: c.data.map((x) => ({ ...x, attachments: (x.attachments ?? []) as unknown as StoredFile[] })) }
    },
  })
}

function useInv() {
  const qc = useQueryClient()
  return () => { void qc.invalidateQueries({ queryKey: ['requests'] }); void qc.invalidateQueries({ queryKey: ['management'] }) }
}

export function useCreateRequest() {
  const inv = useInv()
  return useMutation({
    mutationFn: async (v: { requester_id: string; type: RequestType; subject: string; description: string; files: File[] }) => {
      const { data, error } = await supabase.from('service_requests').insert({ requester_id: v.requester_id, type: v.type, subject: v.subject, description: v.description || null }).select('id').single()
      if (error) throw error
      if (v.files.length) {
        const attachments = await Promise.all(v.files.map((f) => uploadFile('requests', data.id, f)))
        const { error: e } = await supabase.from('service_request_comments').insert({ request_id: data.id, author_id: v.requester_id, body: 'Anexos enviados com a solicitação.', attachments: attachments as unknown as Json })
        if (e) throw e
      }
      return data.id
    },
    onSuccess: inv,
  })
}

export function useUpdateRequest() {
  const inv = useInv()
  return useMutation({
    mutationFn: async ({ id, ...v }: { id: string; status?: RequestStatus; priority?: string; assigned_to?: string | null }) => {
      const { error } = await supabase.from('service_requests').update(v).eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
}

export function useAddComment() {
  const inv = useInv()
  return useMutation({
    mutationFn: async (v: { request_id: string; author_id: string; body: string; is_internal: boolean; files: File[] }) => {
      const attachments = await Promise.all(v.files.map((f) => uploadFile('requests', v.request_id, f)))
      const { error } = await supabase.from('service_request_comments').insert({ request_id: v.request_id, author_id: v.author_id, body: v.body, is_internal: v.is_internal, attachments: attachments as unknown as Json })
      if (error) throw error
    },
    onSuccess: inv,
  })
}

/** People who can be assigned (holders of requests.manage), via role permissions. */
export function useAssignees(enabled: boolean) {
  return useQuery({
    queryKey: ['requests', 'assignees'],
    enabled,
    staleTime: 300_000,
    queryFn: async () => {
      const { data: rp, error } = await supabase.from('role_permissions').select('role_id').eq('permission_key', 'requests.manage')
      if (error) throw error
      const { data, error: e2 } = await supabase.from('user_roles').select('user:profiles!user_roles_user_id_fkey(id, full_name, status)').in('role_id', rp.map((r) => r.role_id))
      if (e2) throw e2
      const map = new Map<string, string>()
      for (const r of data) if (r.user && r.user.status === 'active') map.set(r.user.id, r.user.full_name)
      return [...map.entries()].map(([id, full_name]) => ({ id, full_name })).sort((a, b) => a.full_name.localeCompare(b.full_name))
    },
  })
}
