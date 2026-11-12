import { BookOpenCheck, CalendarClock, Mountain, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { usePendingAssignments } from '@/features/academic/api'
import type { AgendaItem } from '@/features/agenda/api'
import { useUpcomingMentorings } from '@/features/mentoring/api'
import { fmtWhen } from '@/lib/format'

interface TileProps { icon: ReactNode; label: string; title?: string | null; meta?: string | null; to: string; empty: string }

function Tile({ icon, label, title, meta, to, empty }: TileProps) {
  return (
    <Link to={to} className="group">
      <Card className="h-full p-4 transition-colors group-hover:border-primary/40">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {icon}{label}
        </div>
        {title ? (
          <>
            <p className="line-clamp-2 font-medium leading-snug">{title}</p>
            {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </Card>
    </Link>
  )
}

/** Próxima aula · Próxima mentoria · Atividade pendente · Próximo evento */
export function NextUpTiles({ userId, week }: { userId: string; week: AgendaItem[] }) {
  const now = Date.now()
  const nextClass = week.find((i) => i.item_type === 'class' && new Date(i.ends_at ?? i.starts_at).getTime() > now)
  const nextEvent = week.find((i) => (i.item_type === 'event' || i.item_type === 'visit') && new Date(i.starts_at).getTime() > now)
  const mentoring = useUpcomingMentorings(userId, 1).data?.[0]
  const assignment = usePendingAssignments(userId).data?.[0]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile icon={<BookOpenCheck className="h-3.5 w-3.5" />} label="Próxima aula" to="/agenda"
        title={nextClass?.subtitle ?? nextClass?.title} meta={nextClass && fmtWhen(nextClass.starts_at)} empty="Sem aulas nos próximos dias" />
      <Tile icon={<Sparkles className="h-3.5 w-3.5" />} label="Próxima mentoria" to="/mentorias"
        title={mentoring && `Com ${mentoring.mentor?.full_name}`} meta={mentoring?.scheduled_at && fmtWhen(mentoring.scheduled_at)} empty="Nenhuma agendada" />
      <Tile icon={<CalendarClock className="h-3.5 w-3.5" />} label="Atividade pendente" to="/disciplinas"
        title={assignment?.title} meta={assignment?.due_at && `Prazo: ${fmtWhen(assignment.due_at)}`} empty="Tudo em dia" />
      <Tile icon={<Mountain className="h-3.5 w-3.5" />} label="Próximo evento" to="/experiencias"
        title={nextEvent?.title} meta={nextEvent && fmtWhen(nextEvent.starts_at)} empty="Veja as Experiências Neo" />
    </div>
  )
}
