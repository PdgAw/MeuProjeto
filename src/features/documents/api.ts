import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { storageName } from '@/lib/storage'
import type { Database } from '@/types/database'

export type DocCategory = Database['public']['Enums']['document_category']
export type DocStatus = Database['public']['Enums']['document_status']
type Audience = Database['public']['Enums']['audience_type']

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

const DOC = 'id, title, description, category, status, owner_user_id, current_version, expires_at, requires_signature, created_at, updated_at, created_by, author:profiles!documents_created_by_fkey(full_name), owner:profiles!documents_owner_user_id_fkey(full_name), document_versions(id, version, storage_path, file_name, mime_type, size_bytes, created_at), document_targets(target_type, target_id, role_key), document_acknowledgements(user_id, read_at, signed_at)'

export function useDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ['documents', 'all', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select(DOC).order('updated_at', { ascending: false })
      if (error) throw error
      return data.map((d) => {
        const ack = d.document_acknowledgements.find((a) => a.user_id === userId)
        const latest = [...d.document_versions].sort((a, b) => b.version - a.version)[0] ?? null
        const expired = d.status === 'expired' || (d.expires_at ? new Date(d.expires_at) < new Date() : false)
        const pending = !expired && ((d.status === 'signature_pending' && !ack?.signed_at) || (d.status === 'required_reading' && !ack?.read_at))
        return { ...d, latest, readAt: ack?.read_at ?? null, signedAt: ack?.signed_at ?? null, expired, pending }
      })
    },
  })
}
export type DocRow = NonNullable<ReturnType<typeof useDocuments>['data']>[number]

export function useAcknowledge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { documentId: string; userId: string; sign?: boolean }) => {
      const now = new Date().toISOString()
      const { error } = await supabase.from('document_acknowledgements').upsert({
        document_id: v.documentId, user_id: v.userId, read_at: now,
        ...(v.sign ? { signed_at: now, signature_provider: 'neolevel_aceite', signature_reference: `aceite:${v.userId}:${now}` } : {}),
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export interface DocTarget { target_type: Audience; target_id: string | null; role_key: string | null }

/** Creates the document (or a new version of it) and uploads the file to documents/<id>/<version>/. */
export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { existing?: DocRow; file: File; fields?: { title: string; description: string | null; category: DocCategory; status: DocStatus; owner_user_id: string | null; expires_at: string | null; requires_signature: boolean }; targets?: DocTarget[] }) => {
      if (v.file.size > 50 * 1024 * 1024) throw new Error('Arquivo maior que 50 MB.')
      const { data: me } = await supabase.auth.getUser()
      let id = v.existing?.id
      if (!id) {
        const { data, error } = await supabase.from('documents').insert({ ...v.fields!, created_by: me.user!.id }).select('id').single()
        if (error) throw error
        id = data.id
      }
      const version = (v.existing?.current_version ?? 0) + 1
      const path = `${id}/${version}/${storageName(v.file.name)}`
      const { error: up } = await supabase.storage.from('documents').upload(path, v.file, { contentType: v.file.type || undefined })
      if (up) throw new Error(up.message.includes('row-level security') ? 'Sem permissão para enviar documentos.' : up.message)
      const { error: ver } = await supabase.from('document_versions').insert({ document_id: id, version, storage_path: path, file_name: v.file.name, mime_type: v.file.type || null, size_bytes: v.file.size, uploaded_by: me.user!.id })
      if (ver) throw ver
      if (!v.existing && v.targets?.length) {
        const { error: t } = await supabase.from('document_targets').insert(v.targets.map((t) => ({ ...t, document_id: id! })))
        if (t) throw t
      }
      return id
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDocumentRecipients(id: string | undefined) {
  return useQuery({
    queryKey: ['documents', 'recipients', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('document_recipients', { p_document: id! })
      if (error) throw error
      return data
    },
  })
}
