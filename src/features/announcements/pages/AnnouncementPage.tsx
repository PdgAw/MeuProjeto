import { ArrowLeft, CheckCircle2, Eye, Paperclip, Pencil, Users } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { openStoredFile } from '@/lib/storage'
import { useAnnouncementDetail, useAnnouncementStats, useMarkAnnouncement } from '../api'
import { AnnouncementFormDialog } from '../components/AnnouncementFormDialog'
import { TYPE } from '../components/labels'

export default function AnnouncementPage() {
  const { id } = useParams()
  const { user, hasPermission } = useAuth()
  const { data: a, isPending } = useAnnouncementDetail(id, user?.user_id)
  const mark = useMarkAnnouncement()
  const [editing, setEditing] = useState(false)
  const manage = Boolean(a && user && (a.author_id === user.user_id || hasPermission('communications.create')))
  const stats = useAnnouncementStats(id, manage)
  const shouldMark = Boolean(a && user && !a.isRead && a.status === 'published' && new Date(a.publish_at) <= new Date() && a.author_id !== user.user_id)
  useEffect(() => { if (shouldMark && a && user) mark.mutate({ id: a.id, userId: user.user_id }) }, [shouldMark]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null
  if (isPending) return <CardSkeleton lines={4} />
  if (!a) return <p className="text-muted-foreground">Comunicado não encontrado.</p>
  const s = stats.data?.stats
  return (
    <div className="space-y-6">
      <Link to="/comunicados" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Comunicados</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] [&>*]:min-w-0">
        <Card><CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={TYPE[a.type].variant}>{TYPE[a.type].label}</Badge>
            {a.status === 'draft' && <Badge variant="outline">Rascunho</Badge>}
            {new Date(a.publish_at) > new Date() && <Badge variant="warning">Agendado</Badge>}
          </div>
          <h1 className="text-2xl font-semibold">{a.title}</h1>
          <p className="text-sm text-muted-foreground">{a.author?.full_name} · {format(new Date(a.publish_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
          <p className="whitespace-pre-line leading-relaxed">{a.body}</p>
          {a.attachments.length > 0 && (
            <div className="space-y-1.5 border-t pt-4">
              {a.attachments.map((f) => <button key={f.path} onClick={() => void openStoredFile('announcements', f.path).catch((e) => toast.error(e.message))} className="flex items-center gap-2 text-sm text-primary hover:underline"><Paperclip className="h-4 w-4" />{f.name}</button>)}
            </div>
          )}
          {a.requires_ack && a.author_id !== user.user_id && (
            <div className="border-t pt-4">
              {a.ackAt ? <p className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" />Leitura confirmada em {format(new Date(a.ackAt), 'dd/MM HH:mm')}</p>
                : <Button onClick={() => mark.mutate({ id: a.id, userId: user.user_id, ack: true }, { onSuccess: () => toast.success('Leitura confirmada.') })}><CheckCircle2 /> Confirmo que li</Button>}
            </div>
          )}
        </CardContent></Card>
        {manage && (
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => setEditing(true)}><Pencil /> Editar</Button>
            <SectionCard title="Alcance" icon={<Eye className="h-4 w-4 text-primary" />}>
              {stats.isPending ? <CardSkeleton lines={1} /> : s && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="font-display text-2xl font-semibold tabular-nums">{s.sent}</p><p className="text-xs text-muted-foreground">Enviado para</p></div>
                    <div><p className="font-display text-2xl font-semibold tabular-nums text-success">{s.read}</p><p className="text-xs text-muted-foreground">Visualizado</p></div>
                    <div><p className="font-display text-2xl font-semibold tabular-nums text-warning">{s.pending}</p><p className="text-xs text-muted-foreground">Pendente</p></div>
                  </div>
                  {a.requires_ack && <p className="text-xs text-muted-foreground">{s.acknowledged} confirmaram a leitura.</p>}
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto text-sm">
                    {stats.data?.people.map((p) => (
                      <li key={p.user_id} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-muted-foreground" />{p.full_name}</span>
                        {p.acknowledged_at ? <Badge variant="success">Confirmou</Badge> : p.read_at ? <Badge variant="secondary">Leu</Badge> : <Badge variant="warning">Pendente</Badge>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
      <AnnouncementFormDialog open={editing} onOpenChange={setEditing} announcement={a} />
    </div>
  )
}
