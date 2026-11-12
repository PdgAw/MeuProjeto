import { CalendarRange } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { AGENDA_TYPE_LABEL, agendaSubtitle } from '@/config/labels'
import type { AgendaItem } from '@/features/agenda/api'
import { fmtTime } from '@/lib/format'
import { cn } from '@/lib/utils'

/** "Minha semana" — the next 7 days grouped by day. */
export function WeekCard({ items, loading }: { items: AgendaItem[]; loading: boolean }) {
  const days = new Map<string, AgendaItem[]>()
  for (const i of items) {
    const key = format(new Date(i.starts_at), 'yyyy-MM-dd')
    days.set(key, [...(days.get(key) ?? []), i])
  }

  return (
    <SectionCard title="Minha semana" icon={<CalendarRange className="h-4 w-4 text-primary" />} action={{ label: 'Agenda', to: '/agenda' }}>
      {loading ? <CardSkeleton /> : days.size === 0 ? <EmptyState text="Semana livre na agenda." /> : (
        <div className="space-y-4">
          {[...days.entries()].map(([day, list]) => {
            const date = new Date(list[0].starts_at)
            return (
              <div key={day} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3">
                <div className={cn('rounded-md py-1.5 text-center', isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                  <p className="text-[10px] font-semibold uppercase">{format(date, 'EEE', { locale: ptBR })}</p>
                  <p className="font-display text-lg font-semibold leading-none">{format(date, 'dd')}</p>
                </div>
                <ul className="space-y-2">
                  {list.map((i) => (
                    <li key={`${i.source}-${i.source_id}`} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.item_type === 'class' ? i.subtitle : i.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {fmtTime(i.starts_at)}{i.item_type === 'class' ? ` · ${i.title}` : agendaSubtitle(i) ? ` · ${agendaSubtitle(i)}` : ''}
                        </p>
                      </div>
                      <Badge variant={i.item_type === 'deadline' ? 'warning' : 'secondary'} className="shrink-0">
                        {AGENDA_TYPE_LABEL[i.item_type]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}
