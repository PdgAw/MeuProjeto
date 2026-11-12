import { ArrowLeft, CalendarClock, CheckCircle2, Clock, MapPin, Paperclip, Pencil, Video, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtTime } from '@/lib/format'
import { openStoredFile } from '@/lib/storage'
import { initials } from '@/lib/utils'
import { useAttachSessionFiles, useCancelSession, useSession, useUpdateSharedRecord } from '../api'
import { ActionItemsPanel } from '../components/ActionItemsPanel'
import { CompleteSessionDialog } from '../components/CompleteSessionDialog'
import { GoalsPanel } from '../components/GoalsPanel'
import { PrivateNotesPanel } from '../components/PrivateNotesPanel'
import { ScheduleSessionDialog } from '../components/ScheduleSessionDialog'
import { SESSION_STATUS } from '../components/labels'

export default function SessionPage() {
  const { id } = useParams()
  const { user, hasPermission } = useAuth()
  const { data: s, isPending } = useSession(id)
  const cancel = useCancelSession()
  const attach = useAttachSessionFiles(id ?? '')
  const [completing, setCompleting] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  if (!user) return null
  if (isPending) return <CardSkeleton lines={4} />
  if (!s) return <p className="text-muted-foreground">Mentoria não encontrada ou sem acesso.</p>

  const isMentor = s.mentor_id === user.user_id
  const isManager = hasPermission('mentoring.manage')
  const isStudent = s.student_id === user.user_id
  const mentorSide = (isMentor || isManager) && !isStudent
  const open = s.status === 'requested' || s.status === 'scheduled'
  // A session can be closed from 15 min before its start (not days ahead).
  const canComplete = s.status === 'scheduled' && Boolean(s.scheduled_at) && new Date(s.scheduled_at!).getTime() <= Date.now() + 15 * 60_000
  const st = SESSION_STATUS[s.status]
  const other = isStudent ? s.mentor : s.student

  return (
    <div className="space-y-6">
      <Link to="/mentorias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Mentorias</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">{other?.avatar_url && <AvatarImage src={other.avatar_url} alt="" />}<AvatarFallback>{initials(other?.full_name)}</AvatarFallback></Avatar>
          <div>
            <p className="text-sm text-muted-foreground">{isStudent ? 'Neomentoria com' : 'Neomentoria de'}</p>
            <h1 className="text-2xl font-semibold">{other?.full_name}</h1>
            <div className="mt-1 flex gap-2"><Badge variant={st.variant}>{st.label}</Badge>{s.topics.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {mentorSide && s.status === 'requested' && <Button onClick={() => setScheduling(true)}><CalendarClock /> Confirmar horário</Button>}
          {mentorSide && s.status === 'scheduled' && <Button variant="outline" onClick={() => setScheduling(true)}>Reagendar</Button>}
          {mentorSide && canComplete && <Button onClick={() => setCompleting(true)}><CheckCircle2 /> Concluir mentoria</Button>}
          {open && (isStudent || mentorSide) && (
            <Button variant="ghost" onClick={() => {
              const reason = prompt('Motivo do cancelamento (opcional):')
              if (reason !== null) cancel.mutate({ id: s.id, reason }, { onSuccess: () => toast.success('Mentoria cancelada.'), onError: (e) => toast.error(e.message) })
            }}><XCircle /> Cancelar</Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card><CardContent className="grid gap-4 pt-5 text-sm sm:grid-cols-3">
            <Info icon={<CalendarClock className="h-4 w-4" />} label="Data" value={s.scheduled_at ? format(new Date(s.scheduled_at), "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'A definir'} />
            <Info icon={<Clock className="h-4 w-4" />} label="Horário" value={s.scheduled_at ? `${fmtTime(s.scheduled_at)} · ${s.duration_min} min` : '—'} />
            <Info icon={s.modality === 'online' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} label="Modalidade" value={s.modality === 'online' ? 'Online' : s.location ?? (s.modality === 'hybrid' ? 'Híbrida' : 'Presencial')} />
            {s.request_note && <div className="rounded-md bg-secondary/60 p-3 sm:col-span-3"><p className="text-xs font-semibold text-muted-foreground">Pedido do Neoleader</p><p className="mt-1 whitespace-pre-line">{s.request_note}</p></div>}
            {s.meeting_url && open && <Button asChild className="sm:col-span-3 sm:w-fit"><a href={s.meeting_url} target="_blank" rel="noreferrer"><Video /> Entrar na chamada</a></Button>}
            {s.canceled_reason && <p className="text-muted-foreground sm:col-span-3">Cancelada: {s.canceled_reason}</p>}
          </CardContent></Card>

          <SectionCard title="Registro da sessão (compartilhado)">
            <SharedRecord sessionId={s.id} editable={mentorSide && s.status !== 'canceled'} record={s} />
          </SectionCard>

          <SectionCard title="Próximos passos"><ActionItemsPanel sessionId={s.id} studentId={s.student_id} canAdd={mentorSide} /></SectionCard>

          <SectionCard title="Arquivos">
            <ul className="space-y-1.5">
              {s.files.map((f) => (
                <li key={f.path}><button onClick={() => void openStoredFile('mentoring', f.path).catch((e) => toast.error(e.message))} className="flex items-center gap-2 text-sm text-primary hover:underline"><Paperclip className="h-4 w-4" />{f.name}</button></li>
              ))}
              {!s.files.length && <li className="text-sm text-muted-foreground">Nenhum arquivo.</li>}
            </ul>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
              <Paperclip className="h-4 w-4" /> {attach.isPending ? 'Enviando…' : 'Anexar arquivo'}
              <input type="file" multiple className="sr-only" disabled={attach.isPending} onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length) attach.mutate(files, { onSuccess: () => toast.success('Arquivo anexado.'), onError: (er) => toast.error(er.message) })
              }} />
            </label>
          </SectionCard>
        </div>
        <aside className="space-y-6">
          {mentorSide && <SectionCard title="Notas privadas"><PrivateNotesPanel studentId={s.student_id} sessionId={s.id} /></SectionCard>}
          <SectionCard title="Metas do Neoleader"><GoalsPanel ownerId={s.student_id} source="mentoring" sessionId={s.id} /></SectionCard>
        </aside>
      </div>
      {completing && <CompleteSessionDialog open onOpenChange={setCompleting} session={s} />}
      {scheduling && <ScheduleSessionDialog open onOpenChange={setScheduling} mentorId={s.mentor_id} mentees={[{ id: s.student_id, name: s.student?.full_name ?? '' }]} session={s} />}
    </div>
  )
}

function SharedRecord({ sessionId, editable, record }: { sessionId: string; editable: boolean; record: { summary: string | null; difficulties: string | null; decisions: string | null; shared_notes: string | null } }) {
  const update = useUpdateSharedRecord(sessionId)
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(record)
  useEffect(() => setV(record), [record])
  const fields = [['summary', 'Resumo'], ['difficulties', 'Dificuldades'], ['decisions', 'Decisões'], ['shared_notes', 'Nota compartilhada']] as const
  const empty = fields.every(([k]) => !record[k])
  if (editing) {
    return (
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); update.mutate(v, { onSuccess: () => { setEditing(false); toast.success('Registro atualizado.') } }) }}>
        {fields.map(([k, l]) => <div key={k}><p className="mb-1 text-xs font-semibold text-muted-foreground">{l}</p><Textarea rows={2} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} aria-label={l} /></div>)}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button><Button type="submit" disabled={update.isPending}>Salvar</Button></div>
      </form>
    )
  }
  return (
    <div className="space-y-3 text-sm">
      {empty ? <p className="text-muted-foreground">O Neomentor registra resumo, dificuldades e decisões ao longo ou ao final da sessão.</p> :
        fields.filter(([k]) => record[k]).map(([k, l]) => <div key={k}><p className="text-xs font-semibold text-muted-foreground">{l}</p><p className="whitespace-pre-line">{record[k]}</p></div>)}
      {editable && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil /> Editar registro</Button>}
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 text-muted-foreground">{icon}</span><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium first-letter:uppercase">{value}</p></div></div>
}
