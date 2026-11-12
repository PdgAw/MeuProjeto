import { CalendarCheck2, CheckCircle2, Clock, MapPin, Video } from 'lucide-react'
import { endOfDay, startOfDay } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { AGENDA_TYPE_LABEL, LESSON_TYPE_LABEL, agendaSubtitle } from '@/config/labels'
import { useSelfCheckIn } from '@/features/academic/api'
import { useAgenda, useTodayLessons, type TodayLesson } from '@/features/agenda/api'
import { fmtTime } from '@/lib/format'

/** "HOJE NA NEOLEVEL" — today's lessons (with check-in) and everything else on today's agenda. */
export function TodayCard({ userId }: { userId: string }) {
  const lessons = useTodayLessons(userId)
  const today = new Date()
  const agenda = useAgenda(startOfDay(today), endOfDay(today))
  const others = (agenda.data ?? []).filter((i) => i.item_type !== 'class')
  const loading = lessons.isPending || agenda.isPending
  const empty = !loading && !lessons.data?.length && !others.length

  return (
    <SectionCard
      title={<span className="tracking-wide">HOJE NA NEOLEVEL</span>}
      icon={<CalendarCheck2 className="h-4 w-4 text-primary" />}
      action={{ label: 'Ver dia', to: '/hoje' }}
    >
      {loading ? (
        <CardSkeleton lines={2} />
      ) : empty ? (
        <EmptyState text="Nada agendado para hoje. Bom dia para avançar no seu negócio." />
      ) : (
        <ul className="divide-y">
          {lessons.data?.map((l) => <LessonRow key={l.id} lesson={l} />)}
          {others.map((i) => (
            <li key={`${i.source}-${i.source_id}`} className="flex gap-4 py-3 first:pt-0 last:pb-0">
              <span className="w-20 shrink-0 font-display text-lg font-semibold tabular-nums">{fmtTime(i.starts_at)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.title}</p>
                <p className="text-sm text-muted-foreground">{AGENDA_TYPE_LABEL[i.item_type]}{agendaSubtitle(i) ? ` · ${agendaSubtitle(i)}` : ''}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function LessonRow({ lesson: l }: { lesson: TodayLesson }) {
  const checkIn = useSelfCheckIn()
  const where = l.modality === 'online' ? 'Online' : [l.room, l.location].filter(Boolean).join(' · ')
  const attended = l.myAttendance === 'present' || l.myAttendance === 'late'

  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
      <span className="w-20 shrink-0 font-display text-2xl font-semibold tabular-nums">{fmtTime(l.starts_at)}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{l.subject?.name ?? l.title}</p>
          {l.lesson_type !== 'class' && <Badge variant="secondary">{LESSON_TYPE_LABEL[l.lesson_type]}</Badge>}
        </div>
        {l.subject && <p className="text-sm">{l.title}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {l.teacher && <span>Professor {l.teacher.full_name}</span>}
          {l.guest_name && <span>Convidado: {l.guest_name}</span>}
          {where && (
            <span className="flex items-center gap-1">
              {l.modality === 'online' ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              {where}
            </span>
          )}
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />até {fmtTime(l.ends_at)}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {attended ? (
          <Badge variant="success" className="h-8 px-3"><CheckCircle2 className="h-3.5 w-3.5" /> Presença confirmada</Badge>
        ) : l.checkin_open ? (
          <Button
            size="sm"
            variant="accent"
            disabled={checkIn.isPending}
            onClick={() =>
              checkIn.mutate(l.id, {
                onSuccess: () => toast.success('Check-in realizado!'),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            Fazer check-in
          </Button>
        ) : null}
        {l.meeting_url && (
          <Button size="sm" variant="outline" asChild>
            <a href={l.meeting_url} target="_blank" rel="noreferrer">Entrar</a>
          </Button>
        )}
        <Button size="sm" variant="outline" disabled title="Detalhes da aula na Fase 4">Ver aula</Button>
      </div>
    </li>
  )
}
