import { Award, BookOpen, Building2, CalendarDays, CheckCircle2, CircleDot, Flag, FolderKanban, Lock, Mountain, Presentation, Sparkles, type LucideIcon } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { JOURNEY_KIND_LABEL, JOURNEY_STATUS_LABEL, type JourneyStatus } from '@/config/labels'
import { fmtDate, parseLocalDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { JourneyItem } from '../api'

const KIND_ICON: Record<JourneyItem['kind'], LucideIcon> = {
  subject: BookOpen, mentoring: Sparkles, project: FolderKanban, event: CalendarDays, company_visit: Building2,
  milestone: Flag, panel: Presentation, experience: Mountain, certification: Award,
}
const STATUS_BADGE: Record<JourneyStatus, BadgeProps['variant']> = {
  completed: 'success', in_progress: 'default', upcoming: 'secondary', blocked: 'warning',
}

export function JourneyTimeline({ items }: { items: JourneyItem[] }) {
  return (
    <ol className="relative space-y-1">
      {items.map((item, idx) => {
        const Icon = KIND_ICON[item.kind]
        const last = idx === items.length - 1
        const dates = item.starts_on
          ? item.ends_on && item.ends_on !== item.starts_on
            ? `${fmtDate(parseLocalDate(item.starts_on))} – ${fmtDate(parseLocalDate(item.ends_on))}`
            : fmtDate(parseLocalDate(item.starts_on))
          : 'Data a definir'
        return (
          <li key={`${item.source}-${item.item_id}`} className="relative grid grid-cols-[2.5rem_1fr] gap-3 pb-5">
            {!last && <span aria-hidden className={cn('absolute left-[1.2rem] top-10 h-[calc(100%-2.5rem)] w-0.5', item.status === 'completed' ? 'bg-primary/40' : 'bg-border')} />}
            <span
              className={cn(
                'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2',
                item.status === 'completed' && 'border-primary bg-primary text-primary-foreground',
                item.status === 'in_progress' && 'border-primary bg-card text-primary',
                item.status === 'upcoming' && 'border-border bg-card text-muted-foreground',
                item.status === 'blocked' && 'border-warning/60 bg-warning/10 text-warning',
              )}
            >
              {item.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : item.status === 'blocked' ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <div className={cn('rounded-lg border bg-card p-4', item.status === 'in_progress' && 'border-primary/40 shadow-sm')}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{JOURNEY_KIND_LABEL[item.kind]}</span>
                <Badge variant={STATUS_BADGE[item.status]}>
                  {item.status === 'in_progress' && <CircleDot className="h-3 w-3" />}
                  {JOURNEY_STATUS_LABEL[item.status]}
                </Badge>
              </div>
              <p className="mt-1.5 font-semibold">{item.title}</p>
              {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{dates}</p>
              {item.requirements.length > 0 && item.status !== 'completed' && (
                <ul className="mt-3 space-y-1 border-t pt-3">
                  {item.requirements.map((r) => (
                    <li key={r.label} className={cn('flex items-center gap-2 text-xs', r.met ? 'text-success' : 'text-muted-foreground')}>
                      {r.met ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{r.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
