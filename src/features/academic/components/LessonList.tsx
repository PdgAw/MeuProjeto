import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DoorOpen, MapPin, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/SectionCard'
import { LESSON_TYPE_LABEL } from '@/config/labels'
import { fmtTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { LessonRow } from '../api'

/** Lessons grouped by day — used by the teacher's and the management's lesson views. */
export function LessonList({ lessons, empty = 'Nenhuma aula no período.' }: { lessons: LessonRow[]; empty?: string }) {
  if (!lessons.length) return <EmptyState text={empty} />
  const days = new Map<string, LessonRow[]>()
  for (const l of lessons) {
    const k = format(new Date(l.starts_at), 'yyyy-MM-dd')
    days.set(k, [...(days.get(k) ?? []), l])
  }
  return (
    <div className="space-y-5">
      {[...days.values()].map((list) => {
        const d = new Date(list[0].starts_at)
        return (
          <section key={d.toDateString()}>
            <h3 className={cn('mb-2 text-sm font-semibold first-letter:uppercase', isToday(d) ? 'text-primary' : 'text-muted-foreground')}>
              {isToday(d) ? 'Hoje · ' : ''}{format(d, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <ul className="divide-y rounded-lg border bg-card">
              {list.map((l) => (
                <li key={l.id}>
                  <Link to={`/aulas/${l.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/40">
                    <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">{fmtTime(l.starts_at)}–{fmtTime(l.ends_at)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l.subject?.name} · {l.title}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {l.modality === 'online' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {l.modality === 'online' ? 'Online' : [l.room, l.location].filter(Boolean).join(' · ')} · {l.cohort?.name}
                        {l.teacher ? ` · Prof. ${l.teacher.full_name}` : ''}
                      </p>
                    </div>
                    {l.checkin_open && <Badge variant="accent"><DoorOpen className="h-3 w-3" />Check-in aberto</Badge>}
                    {l.status === 'canceled' ? <Badge variant="destructive">Cancelada</Badge> : l.lesson_type !== 'class' && <Badge variant="secondary">{LESSON_TYPE_LABEL[l.lesson_type]}</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
