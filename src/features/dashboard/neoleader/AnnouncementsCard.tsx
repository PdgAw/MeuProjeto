import { Megaphone, Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { useLatestAnnouncements } from '@/features/announcements/api'
import { fmtRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

export function AnnouncementsCard({ userId }: { userId: string }) {
  const { data, isPending } = useLatestAnnouncements(userId)
  return (
    <SectionCard title="Comunicados" icon={<Megaphone className="h-4 w-4 text-primary" />} action={{ label: 'Todos', to: '/comunicados' }}>
      {isPending ? <CardSkeleton /> : !data?.length ? <EmptyState text="Nenhum comunicado." /> : (
        <ul className="space-y-3">
          {data.map((a) => (
            <li key={a.id} className="flex gap-3">
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.isRead ? 'bg-transparent' : 'bg-primary')}
                aria-label={a.isRead ? undefined : 'Não lido'} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {a.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Fixado" />}
                  <p className={cn('truncate text-sm', !a.isRead && 'font-semibold')}>{a.title}</p>
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">{a.body}</p>
                <div className="mt-1 flex items-center gap-2">
                  {a.type === 'urgent' && <Badge variant="destructive">Urgente</Badge>}
                  <span className="text-[11px] text-muted-foreground">{fmtRelative(a.publish_at)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
