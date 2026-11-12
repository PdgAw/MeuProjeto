import { Bell, CalendarClock, CheckCheck, ClipboardList, FileText, Inbox, Megaphone, MessagesSquare, Presentation, Sparkles, type LucideIcon } from 'lucide-react'
import { isToday } from 'date-fns'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNotificationActions, useNotifications } from './api'

const ICON: Record<string, LucideIcon> = {
  message: MessagesSquare, lesson_new: Presentation, lesson_changed: CalendarClock, mentoring_new: Sparkles, mentoring_requested: Sparkles,
  mentoring_soon: Sparkles, assignment_new: ClipboardList, deadline_soon: ClipboardList, document_new: FileText, announcement: Megaphone, request: Inbox,
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { data, isPending } = useNotifications(user?.user_id)
  const { read, readAll } = useNotificationActions()
  const navigate = useNavigate()
  const [unreadOnly, setUnreadOnly] = useState(false)
  if (!user) return null
  const list = (data ?? []).filter((n) => !unreadOnly || !n.read_at)
  const groups = [['Hoje', list.filter((n) => isToday(new Date(n.created_at)))], ['Anteriores', list.filter((n) => !isToday(new Date(n.created_at)))]] as const
  const unread = (data ?? []).filter((n) => !n.read_at).length
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Notificações</h1><p className="mt-1 text-muted-foreground">{unread ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia.'}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUnreadOnly(!unreadOnly)}>{unreadOnly ? 'Mostrar todas' : 'Só não lidas'}</Button>
          <Button variant="outline" disabled={!unread || readAll.isPending} onClick={() => readAll.mutate()}><CheckCheck /> Marcar todas como lidas</Button>
        </div>
      </header>
      {isPending ? <CardSkeleton lines={5} /> : !list.length ? <EmptyState icon={<Bell className="h-6 w-6" />} text="Nenhuma notificação." /> : groups.map(([label, items]) => items.length > 0 && (
        <section key={label} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>
          <ul className="divide-y rounded-lg border bg-card">
            {items.map((n) => {
              const Icon = ICON[n.type] ?? Bell
              return (
                <li key={n.id}>
                  <button className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/40', !n.read_at && 'bg-primary/5')}
                    onClick={() => { if (!n.read_at) read.mutate(n.id); if (n.link) navigate(n.link) }}>
                    <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', n.read_at ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary')}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block', !n.read_at && 'font-semibold')}>{n.title}</span>
                      {n.body && <span className="block truncate text-sm text-muted-foreground">{n.body}</span>}
                      <span className="text-xs text-muted-foreground">{fmtRelative(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
