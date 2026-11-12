import { Lock, Paperclip, Send, X } from 'lucide-react'
import { format } from 'date-fns'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtBytes, openStoredFile } from '@/lib/storage'
import { cn, initials } from '@/lib/utils'
import { PRIORITY_LABEL, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL, STAFF_STATUS_LABEL, useAddComment, useAssignees, useRequest, useUpdateRequest, type RequestStatus } from '../api'

/** A request with its conversation. Staff (requests.manage) also triages and writes internal notes. */
export function RequestThread({ id, staff }: { id: string; staff: boolean }) {
  const { user } = useAuth()
  const { data, isPending } = useRequest(id)
  const update = useUpdateRequest()
  const comment = useAddComment()
  const assignees = useAssignees(staff)
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  if (isPending) return <CardSkeleton lines={4} />
  if (!data || !user) return <p className="text-sm text-muted-foreground">Solicitação não encontrada.</p>
  const r = data.request
  const closed = r.status === 'resolved' || r.status === 'canceled'
  const labels = staff ? STAFF_STATUS_LABEL : REQUEST_STATUS_LABEL
  const onErr = (e: Error) => toast.error(e.message)
  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    comment.mutate({ request_id: id, author_id: user.user_id, body: body.trim(), is_internal: staff && internal, files }, {
      onSuccess: () => {
        setBody(''); setFiles([])
        // Replying to "aguardando você" moves the request back to analysis.
        if (!staff && r.status === 'awaiting_user') update.mutate({ id, status: 'in_review' })
      },
      onError: onErr,
    })
  }
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5"><Badge variant="outline">{REQUEST_TYPE_LABEL[r.type]}</Badge><Badge variant={r.status === 'resolved' ? 'success' : r.status === 'awaiting_user' ? 'warning' : r.status === 'canceled' ? 'outline' : 'default'}>{labels[r.status]}</Badge>
          {staff && r.priority !== 'normal' && <Badge variant={r.priority === 'high' ? 'destructive' : 'secondary'}>Prioridade {PRIORITY_LABEL[r.priority].toLowerCase()}</Badge>}</div>
        <h2 className="font-display text-xl font-semibold">{r.subject}</h2>
        <p className="text-xs text-muted-foreground">{staff && <>{r.requester?.full_name} · </>}aberta em {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm")}{r.resolved_at && ` · resolvida em ${format(new Date(r.resolved_at), 'dd/MM/yyyy')}`}</p>
        {r.description && <p className="whitespace-pre-line text-sm">{r.description}</p>}
      </div>

      {staff ? (
        <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-medium">Status<Select value={r.status} onChange={(e) => update.mutate({ id, status: e.target.value as RequestStatus }, { onSuccess: () => toast.success('Status atualizado.'), onError: onErr })}>{Object.entries(STAFF_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></label>
          <label className="space-y-1 text-xs font-medium">Responsável<Select value={r.assigned_to ?? ''} onChange={(e) => update.mutate({ id, assigned_to: e.target.value || null, ...(r.status === 'open' && e.target.value ? { status: 'in_review' as const } : {}) }, { onSuccess: () => toast.success('Responsável atualizado.'), onError: onErr })}>
            <option value="">Ninguém</option>{(assignees.data ?? (r.assignee ? [r.assignee] : [])).map((a) => <option key={a.id} value={a.id}>{a.full_name}{a.id === user.user_id ? ' (você)' : ''}</option>)}
            {!assignees.data?.some((a) => a.id === user.user_id) && <option value={user.user_id}>{user.full_name} (você)</option>}</Select></label>
          <label className="space-y-1 text-xs font-medium">Prioridade<Select value={r.priority} onChange={(e) => update.mutate({ id, priority: e.target.value }, { onError: onErr })}>{Object.entries(PRIORITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></label>
        </div>
      ) : !closed && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => window.confirm('Cancelar esta solicitação?') && update.mutate({ id, status: 'canceled' }, { onSuccess: () => toast.success('Solicitação cancelada.'), onError: onErr })}>Cancelar solicitação</Button>
      )}

      <ol className="space-y-3">{data.comments.map((c) => (
        <li key={c.id} className={cn('flex gap-3 rounded-lg p-3 text-sm', c.is_internal ? 'border border-dashed border-warning/60 bg-warning/5' : 'bg-muted/40')}>
          <Avatar className="h-8 w-8">{c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} alt="" />}<AvatarFallback className="text-xs">{initials(c.author?.full_name)}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs"><span className="font-medium">{c.author?.full_name}</span> <span className="text-muted-foreground">· {format(new Date(c.created_at), "dd/MM HH:mm")}</span>{c.is_internal && <span className="ml-2 inline-flex items-center gap-1 text-warning"><Lock className="h-3 w-3" />nota interna</span>}</p>
            <p className="mt-1 whitespace-pre-line">{c.body}</p>
            {c.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{c.attachments.map((f) => (
              <button key={f.path} onClick={() => openStoredFile('requests', f.path).catch(onErr)} className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs hover:bg-secondary"><Paperclip className="h-3 w-3" />{f.name} <span className="text-muted-foreground">{fmtBytes(f.size)}</span></button>
            ))}</div>}
          </div>
        </li>
      ))}</ol>

      {!closed || staff ? (
        <form onSubmit={send} className="space-y-2">
          <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={staff && internal ? 'Nota interna (o solicitante não vê)' : 'Escreva uma mensagem'} aria-label="Mensagem" />
          {files.length > 0 && <div className="flex flex-wrap gap-1.5">{files.map((f, i) => <span key={i} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">{f.name}<button type="button" aria-label="Remover anexo" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button></span>)}</div>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])]); e.target.value = '' }} />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><Paperclip />Anexar</Button>
              {staff && <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={internal} onChange={(e) => setInternal(e.target.checked)} />Nota interna</label>}
            </div>
            <Button type="submit" size="sm" disabled={comment.isPending || !body.trim()}><Send />Enviar</Button>
          </div>
        </form>
      ) : <p className="text-sm text-muted-foreground">Esta solicitação foi encerrada. Abra uma nova se precisar.</p>}
    </div>
  )
}
