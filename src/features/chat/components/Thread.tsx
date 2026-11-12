import { ArrowLeft, Bell, BellOff, CornerUpLeft, Loader2, Paperclip, Pencil, Send, Trash2, Users, X } from 'lucide-react'
import { format, isSameDay, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { cn, initials } from '@/lib/utils'
import { markRead, useEditMessage, useMessages, useSendMessage, useToggleMute, useTyping, type ConversationItem, type Message } from '../api'
import { Attachment } from './Attachment'

const dayLabel = (d: Date) => (isToday(d) ? 'Hoje' : isYesterday(d) ? 'Ontem' : format(d, "EEEE, dd 'de' MMMM", { locale: ptBR }))

export function Thread({ conversation: c, me }: { conversation: ConversationItem; me: { id: string; name: string } }) {
  const { data, isPending } = useMessages(c.id)
  const send = useSendMessage(c.id, me.id)
  const edit = useEditMessage(c.id)
  const mute = useToggleMute(me.id)
  const { typingNames, notify } = useTyping(c.id, me)
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<Message | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const messages = data ?? []
  const byId = new Map(messages.map((m) => [m.id, m]))

  useLayoutEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages.length, c.id])
  useEffect(() => { void markRead(c.id) }, [c.id, messages.length])

  const submit = () => {
    if (editing) {
      if (!text.trim()) return
      edit.mutate({ id: editing.id, body: text.trim() }, { onSuccess: () => { setEditing(null); setText('') }, onError: (e) => toast.error(e.message) })
      return
    }
    if (!text.trim() && !files.length) return
    send.mutate({ body: text, replyTo: replyTo?.id, files }, { onSuccess: () => { setText(''); setFiles([]); setReplyTo(null) }, onError: (e) => toast.error(e.message) })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b px-3 py-2.5">
        <Link to="/chat" className="lg:hidden" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Link>
        <Avatar className="h-9 w-9">{c.avatar_url && <AvatarImage src={c.avatar_url} alt="" />}<AvatarFallback>{c.type === 'direct' ? initials(c.title) : <Users className="h-4 w-4" />}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{c.title}</p>
          <p className="truncate text-xs text-muted-foreground">{typingNames.length ? `${typingNames.join(', ')} digitando…` : c.type === 'direct' ? 'Conversa direta' : `${c.member_count} participantes`}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => mute.mutate({ conversationId: c.id, muted: !c.is_muted }, { onSuccess: () => toast.success(c.is_muted ? 'Notificações reativadas.' : 'Conversa silenciada.') })}
          aria-label={c.is_muted ? 'Reativar notificações' : 'Silenciar conversa'} title={c.is_muted ? 'Reativar notificações' : 'Silenciar conversa'}>
          {c.is_muted ? <BellOff /> : <Bell />}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
        {isPending ? <CardSkeleton /> : !messages.length ? <p className="py-10 text-center text-sm text-muted-foreground">Comece a conversa. 👋</p> : messages.map((m, i) => {
          const d = new Date(m.created_at)
          const newDay = i === 0 || !isSameDay(d, new Date(messages[i - 1].created_at))
          const mine = m.sender_id === me.id
          const grouped = !newDay && i > 0 && messages[i - 1].sender_id === m.sender_id && d.getTime() - new Date(messages[i - 1].created_at).getTime() < 5 * 60e3
          const quoted = m.reply_to_id ? byId.get(m.reply_to_id) : null
          return (
            <Fragment key={m.id}>
              {newDay && <p className="my-3 text-center text-xs font-medium text-muted-foreground first-letter:uppercase">{dayLabel(d)}</p>}
              <div className={cn('group flex gap-2', mine ? 'justify-end' : 'justify-start', grouped ? 'mt-0.5' : 'mt-3')}>
                {!mine && c.type !== 'direct' && <div className="w-7 shrink-0">{!grouped && <Avatar className="h-7 w-7">{m.sender?.avatar_url && <AvatarImage src={m.sender.avatar_url} alt="" />}<AvatarFallback className="text-[10px]">{initials(m.sender?.full_name)}</AvatarFallback></Avatar>}</div>}
                <div className={cn('max-w-[78%] space-y-1', mine && 'items-end text-right')}>
                  {!mine && !grouped && c.type !== 'direct' && <p className="px-1 text-xs font-medium text-muted-foreground">{m.sender?.full_name}</p>}
                  <div className={cn('inline-block rounded-2xl px-3.5 py-2 text-left text-sm', mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-card shadow-sm ring-1 ring-border', m.deleted_at && 'italic opacity-70')}>
                    {quoted && <div className={cn('mb-1.5 border-l-2 pl-2 text-xs', mine ? 'border-white/60 opacity-80' : 'border-primary/50 text-muted-foreground')}><span className="font-semibold">{quoted.sender?.full_name?.split(' ')[0]}</span>: {quoted.deleted_at ? 'mensagem excluída' : quoted.body ?? '📎 arquivo'}</div>}
                    {m.deleted_at ? 'Mensagem excluída' : (
                      <>
                        {m.attachments.length > 0 && <div className="mb-1 space-y-1.5">{m.attachments.map((f) => <Attachment key={f.path} file={f} mine={mine} />)}</div>}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      </>
                    )}
                    <p className={cn('mt-0.5 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{format(d, 'HH:mm')}{m.edited_at && !m.deleted_at ? ' · editada' : ''}</p>
                  </div>
                  {!m.deleted_at && (
                    <div className={cn('flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100', mine ? 'justify-end' : 'justify-start')}>
                      <button className="rounded p-1 text-muted-foreground hover:bg-secondary" onClick={() => { setReplyTo(m); setEditing(null) }} aria-label="Responder"><CornerUpLeft className="h-3.5 w-3.5" /></button>
                      {mine && m.body && <button className="rounded p-1 text-muted-foreground hover:bg-secondary" onClick={() => { setEditing(m); setReplyTo(null); setText(m.body ?? '') }} aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></button>}
                      {mine && <button className="rounded p-1 text-muted-foreground hover:bg-secondary" onClick={() => { if (confirm('Excluir esta mensagem para todos?')) edit.mutate({ id: m.id, remove: true }) }} aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}
        <div ref={bottom} />
      </div>

      <div className="border-t p-3">
        {(replyTo || editing) && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-xs">
            {editing ? <Pencil className="h-3.5 w-3.5" /> : <CornerUpLeft className="h-3.5 w-3.5" />}
            <span className="flex-1 truncate">{editing ? 'Editando mensagem' : <>Respondendo a <strong>{replyTo!.sender?.full_name}</strong>: {replyTo!.body ?? 'arquivo'}</>}</span>
            <button onClick={() => { setReplyTo(null); if (editing) { setEditing(null); setText('') } }} aria-label="Cancelar"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {files.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{files.map((f, i) => <span key={i} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">{f.name}<button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remover anexo"><X className="h-3 w-3" /></button></span>)}</div>}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit() }}>
          {!editing && (
            <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-secondary" aria-label="Anexar arquivo">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="sr-only" onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])} />
            </label>
          )}
          <Textarea rows={1} className="max-h-40 min-h-10 resize-none" placeholder="Escreva uma mensagem" value={text} aria-label="Mensagem"
            onChange={(e) => { setText(e.target.value); notify() }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }} />
          <Button type="submit" size="icon" disabled={send.isPending || edit.isPending} aria-label="Enviar">{send.isPending ? <Loader2 className="animate-spin" /> : <Send />}</Button>
        </form>
      </div>
    </div>
  )
}
