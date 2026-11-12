import { CheckCircle2, MapPin, Pencil, Plus, Video, XCircle } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { LESSON_TYPE_LABEL } from '@/config/labels'
import { fmtTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useMyAttendanceMap, useSubjectLessons, type LessonRow } from '../../api'
import { LessonFormDialog } from '../LessonFormDialog'
import { ATTENDANCE_LABEL, MODALITY_LABEL } from './shared'

interface Props {
  subjectId: string
  userId: string
  canTeach: boolean
  isStudent: boolean
  cohortId?: string | null
  cohorts: { id: string; name: string }[]
  /** "schedule" = compact month timeline · "lessons" = detailed cards */
  variant: 'schedule' | 'lessons'
}

export function LessonsTab({ subjectId, userId, canTeach, isStudent, cohortId, cohorts, variant }: Props) {
  const { data, isPending } = useSubjectLessons(subjectId)
  const lessons = (data ?? []).filter((l) => !isStudent || !cohortId || l.cohort_id === cohortId)
  const att = useMyAttendanceMap(isStudent ? lessons.map((l) => l.id) : [], userId)
  const [editing, setEditing] = useState<LessonRow | null | undefined>(undefined)

  if (isPending) return <CardSkeleton />
  const months = new Map<string, LessonRow[]>()
  for (const l of lessons) {
    const k = format(new Date(l.starts_at), 'yyyy-MM')
    months.set(k, [...(months.get(k) ?? []), l])
  }

  return (
    <div className="space-y-4">
      {canTeach && (
        <div className="flex justify-end"><Button onClick={() => setEditing(null)}><Plus /> Nova aula</Button></div>
      )}
      {!lessons.length ? <EmptyState text="Nenhuma aula cadastrada." /> : variant === 'schedule' ? (
        <div className="space-y-6">
          {[...months.entries()].map(([m, list]) => (
            <section key={m}>
              <h3 className="mb-2 text-sm font-semibold first-letter:uppercase text-muted-foreground">{format(new Date(list[0].starts_at), 'MMMM yyyy', { locale: ptBR })}</h3>
              <ol className="divide-y rounded-lg border bg-card">
                {list.map((l) => {
                  const past = isPast(new Date(l.ends_at))
                  return (
                    <li key={l.id}>
                      <Link to={`/aulas/${l.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/40">
                        <div className={cn('w-12 text-center', past && 'text-muted-foreground')}>
                          <p className="text-[10px] font-semibold uppercase">{format(new Date(l.starts_at), 'EEE', { locale: ptBR })}</p>
                          <p className="font-display text-lg font-semibold leading-none">{format(new Date(l.starts_at), 'dd')}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('truncate font-medium', l.status === 'canceled' && 'line-through')}>{l.title}</p>
                          <p className="text-xs text-muted-foreground">{fmtTime(l.starts_at)}–{fmtTime(l.ends_at)} · {LESSON_TYPE_LABEL[l.lesson_type]}{cohorts.length > 1 ? ` · ${l.cohort?.name}` : ''}</p>
                        </div>
                        {isStudent && past && <AttendanceMark status={att.data?.get(l.id)} />}
                        {l.status === 'canceled' && <Badge variant="destructive">Cancelada</Badge>}
                      </Link>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lessons.map((l) => (
            <Card key={l.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{LESSON_TYPE_LABEL[l.lesson_type]}</Badge>
                  <Badge variant="outline">{MODALITY_LABEL[l.modality]}</Badge>
                </div>
                {canTeach && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(l)} aria-label="Editar aula"><Pencil className="h-4 w-4" /></Button>}
              </div>
              <Link to={`/aulas/${l.id}`} className="font-semibold hover:underline">{l.title}</Link>
              <p className="text-sm text-muted-foreground">{format(new Date(l.starts_at), "EEEE, dd/MM · HH:mm", { locale: ptBR })}–{fmtTime(l.ends_at)}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {l.modality === 'online' ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                {l.modality === 'online' ? 'Online' : [l.room, l.location].filter(Boolean).join(' · ')}
                {l.teacher && ` · Prof. ${l.teacher.full_name}`}
              </p>
              {isStudent && isPast(new Date(l.ends_at)) && <AttendanceMark status={att.data?.get(l.id)} />}
            </Card>
          ))}
        </div>
      )}
      {editing !== undefined && (
        <LessonFormDialog open onOpenChange={(o) => !o && setEditing(undefined)} subjectId={subjectId}
          cohorts={cohorts} teacherId={userId} lesson={editing} />
      )}
    </div>
  )
}

function AttendanceMark({ status }: { status: keyof typeof ATTENDANCE_LABEL | undefined }) {
  if (!status) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" />Sem registro</span>
  const ok = status === 'present' || status === 'late'
  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium', ok ? 'text-success' : 'text-destructive')}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{ATTENDANCE_LABEL[status]}
    </span>
  )
}
