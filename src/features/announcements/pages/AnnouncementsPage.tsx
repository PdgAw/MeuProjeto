import { Clock, Paperclip, Pin, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtRelative, fmtWhen } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAnnouncements, type AnnouncementType } from '../api'
import { AnnouncementFormDialog } from '../components/AnnouncementFormDialog'
import { TYPE } from '../components/labels'

type F = 'all' | 'unread' | 'pinned' | 'mine'

export default function AnnouncementsPage() {
  const { user, hasPermission, hasRole } = useAuth()
  const navigate = useNavigate()
  const { data, isPending } = useAnnouncements(user?.user_id)
  const canCreate = hasPermission('communications.create') || hasRole('teacher')
  const [f, setF] = useState<F>('all')
  const [type, setType] = useState<AnnouncementType | ''>('')
  const [creating, setCreating] = useState(false)
  if (!user) return null
  const now = new Date()
  const list = (data ?? []).filter((a) => (f === 'all' || (f === 'unread' && !a.isRead && a.author_id !== user.user_id) || (f === 'pinned' && a.is_pinned) || (f === 'mine' && a.author_id === user.user_id)) && (!type || a.type === type))
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Comunicados</h1><p className="mt-1 text-muted-foreground">Avisos da NeoLevel, da coordenação e dos professores.</p></div>
        {canCreate && <Button onClick={() => setCreating(true)}><Plus /> Novo comunicado</Button>}
      </header>
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'unread', 'pinned', ...(canCreate ? ['mine'] : [])] as F[]).map((k) => (
          <button key={k} onClick={() => setF(k)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', f === k ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}>
            {{ all: 'Todos', unread: 'Não lidos', pinned: 'Fixados', mine: 'Enviados por mim' }[k]}
          </button>
        ))}
        <select className="h-8 rounded-md border bg-background px-2 text-sm" value={type} onChange={(e) => setType(e.target.value as AnnouncementType | '')} aria-label="Tipo">
          <option value="">Todos os tipos</option>{Object.entries(TYPE).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
        </select>
      </div>
      {isPending ? <CardSkeleton lines={4} /> : !list.length ? <EmptyState text="Nenhum comunicado aqui." /> : (
        <ul className="space-y-3">
          {list.map((a) => {
            const scheduled = new Date(a.publish_at) > now
            const unread = !a.isRead && a.author_id !== user.user_id && a.status === 'published' && !scheduled
            return (
              <li key={a.id}>
                <Link to={`/comunicados/${a.id}`} className={cn('block rounded-lg border bg-card p-4 transition-colors hover:border-primary/40', unread && 'border-l-4 border-l-primary', a.type === 'urgent' && 'border-l-4 border-l-destructive')}>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.is_pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" aria-label="Fixado" />}
                    <Badge variant={TYPE[a.type].variant}>{TYPE[a.type].label}</Badge>
                    {a.status === 'draft' && <Badge variant="outline">Rascunho</Badge>}
                    {scheduled && a.status === 'published' && <Badge variant="warning"><Clock className="h-3 w-3" />Agendado: {fmtWhen(a.publish_at)}</Badge>}
                    {a.requires_ack && !a.ackAt && a.author_id !== user.user_id && <Badge variant="warning">Confirme a leitura</Badge>}
                    {a.attachments.length > 0 && <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-label="Com anexo" />}
                  </div>
                  <p className={cn('mt-2', unread ? 'font-semibold' : 'font-medium')}>{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{a.author?.full_name} · {fmtRelative(a.publish_at)}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <AnnouncementFormDialog open={creating} onOpenChange={setCreating} onSaved={(id) => navigate(`/comunicados/${id}`)} />
    </div>
  )
}
