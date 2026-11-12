import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadFile, type StoredFile } from '@/lib/storage'
import type { Database } from '@/types/database'

type ConvType = Database['public']['Enums']['conversation_type']

/** Conversation list; refreshed live whenever any visible message changes (RLS-filtered). */
export function useConversations(userId: string | undefined) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['conversations', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_conversations')
      if (error) throw error
      return data
    },
  })
  useEffect(() => {
    if (!userId) return
    const ch = supabase.channel(`conversations:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void qc.invalidateQueries({ queryKey: ['conversations', userId] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${userId}` }, () => void qc.invalidateQueries({ queryKey: ['conversations', userId] }))
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [userId, qc])
  return q
}
export type ConversationItem = NonNullable<ReturnType<typeof useConversations>['data']>[number]

const MSG = 'id, conversation_id, sender_id, body, reply_to_id, attachments, created_at, edited_at, deleted_at, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)'

export interface Message {
  id: string; conversation_id: string; sender_id: string | null; body: string | null; reply_to_id: string | null
  attachments: StoredFile[]; created_at: string; edited_at: string | null; deleted_at: string | null
  sender: { id: string; full_name: string; avatar_url: string | null } | null
}

/** Last 200 messages, kept in sync through Realtime (inserts, edits, deletions). */
export function useMessages(conversationId: string | undefined) {
  const qc = useQueryClient()
  const key = ['messages', conversationId]
  const q = useQuery({
    queryKey: key,
    enabled: Boolean(conversationId),
    queryFn: async () => {
      const { data, error } = await supabase.from('messages').select(MSG).eq('conversation_id', conversationId!).order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      return (data as unknown as Message[]).map((m) => ({ ...m, attachments: m.attachments ?? [] })).reverse()
    },
  })
  useEffect(() => {
    if (!conversationId) return
    const ch = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        const row = payload.new as { id: string }
        if (!row?.id) return
        const { data } = await supabase.from('messages').select(MSG).eq('id', row.id).maybeSingle()
        if (!data) return
        const msg = { ...(data as unknown as Message), attachments: (data as unknown as Message).attachments ?? [] }
        qc.setQueryData<Message[]>(['messages', conversationId], (old = []) => {
          const i = old.findIndex((m) => m.id === msg.id)
          if (i === -1) return [...old, msg]
          const next = [...old]; next[i] = msg; return next
        })
      })
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [conversationId, qc])
  return { ...q, key }
}

export function useSendMessage(conversationId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { body: string; replyTo?: string | null; files: File[] }) => {
      const attachments = await Promise.all(v.files.map((f) => uploadFile('chat', conversationId, f)))
      const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: userId, body: v.body.trim() || null, reply_to_id: v.replyTo ?? null, attachments: attachments as never })
      if (error) throw error
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['messages', conversationId] }); void qc.invalidateQueries({ queryKey: ['conversations'] }) },
  })
}

export function useEditMessage(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; body?: string; remove?: boolean }) => {
      const { error } = await supabase.from('messages').update(v.remove ? { deleted_at: new Date().toISOString() } : { body: v.body }).eq('id', v.id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['messages', conversationId] }),
  })
}

export async function markRead(conversationId: string) {
  await supabase.rpc('mark_conversation_read', { p_conversation: conversationId })
}

export function useToggleMute(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { conversationId: string; muted: boolean }) => {
      const { error } = await supabase.from('conversation_members').update({ is_muted: v.muted }).eq('conversation_id', v.conversationId).eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}

export async function openDirect(otherId: string) {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', { p_other: otherId })
  if (error) throw error
  return data as string
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { title: string; type: ConvType; members: string[]; cohortId?: string | null }) => {
      const { data, error } = await supabase.rpc('create_group_conversation', { p_title: v.title, p_type: v.type, p_members: v.members, p_cohort: v.cohortId ?? undefined })
      if (error) throw error
      return data as string
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}

export function useContacts(userId: string | undefined) {
  return useQuery({
    queryKey: ['contacts', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, job_title').eq('status', 'active').neq('id', userId!).order('full_name')
      if (error) throw error
      return data
    },
  })
}

export function useMessageSearch(q: string) {
  return useQuery({
    queryKey: ['message-search', q],
    enabled: q.trim().length >= 3,
    queryFn: async () => {
      const { data, error } = await supabase.from('messages').select('id, conversation_id, body, created_at, sender:profiles!messages_sender_id_fkey(full_name)')
        .textSearch('search', q.trim(), { config: 'portuguese', type: 'websearch' }).is('deleted_at', null).order('created_at', { ascending: false }).limit(30)
      if (error) throw error
      return data
    },
  })
}

/** "Fulano está digitando…" via Realtime broadcast (ephemeral, never stored). */
export function useTyping(conversationId: string | undefined, me: { id: string; name: string } | null) {
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({})
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const last = useRef(0)
  useEffect(() => {
    if (!conversationId || !me) return
    const ch = supabase.channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const p = payload as { id: string; name: string }
        if (p.id !== me.id) setTyping((t) => ({ ...t, [p.id]: { name: p.name, at: Date.now() } }))
      })
      .subscribe()
    chRef.current = ch
    const timer = setInterval(() => setTyping((t) => Object.fromEntries(Object.entries(t).filter(([, v]) => Date.now() - v.at < 3500))), 1000)
    return () => { clearInterval(timer); void supabase.removeChannel(ch); chRef.current = null; setTyping({}) }
  }, [conversationId, me?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const notify = () => {
    if (!chRef.current || !me || Date.now() - last.current < 1500) return
    last.current = Date.now()
    void chRef.current.send({ type: 'broadcast', event: 'typing', payload: { id: me.id, name: me.name } })
  }
  return { typingNames: Object.values(typing).map((t) => t.name), notify }
}
