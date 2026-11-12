import { Loader2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { cn, initials } from '@/lib/utils'
import type { Database } from '@/types/database'
import { useLessonRoster, useSetAttendance } from '../api'
import { ATTENDANCE_LABEL } from './subject/shared'

type Status = Database['public']['Enums']['attendance_status']
const OPTIONS: Status[] = ['present', 'late', 'absent', 'excused']
const TONE: Record<Status, string> = {
  present: 'border-success bg-success text-success-foreground',
  late: 'border-warning bg-warning text-warning-foreground',
  absent: 'border-destructive bg-destructive text-destructive-foreground',
  excused: 'border-secondary-foreground/30 bg-secondary text-secondary-foreground',
}

/** Manual attendance: one tap per student, saved in a single batch. */
export function AttendanceRoster({ lessonId, cohortId }: { lessonId: string; cohortId: string }) {
  const roster = useLessonRoster(lessonId, cohortId, true)
  const save = useSetAttendance(lessonId)
  const [draft, setDraft] = useState<Record<string, Status>>({})

  useEffect(() => {
    if (roster.data) setDraft(Object.fromEntries(roster.data.filter((r) => r.attendance).map((r) => [r.id, r.attendance!.status])))
  }, [roster.data])

  if (roster.isPending) return <CardSkeleton />
  if (!roster.data?.length) return <EmptyState text="Nenhum Neoleader matriculado nesta turma." />
  const changed = roster.data.filter((r) => draft[r.id] && draft[r.id] !== r.attendance?.status)
  const counts = OPTIONS.map((o) => [o, Object.values(draft).filter((s) => s === o).length] as const)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {counts.map(([o, n]) => <span key={o}>{ATTENDANCE_LABEL[o]}: <strong className="text-foreground">{n}</strong></span>)}
          <span>Sem registro: <strong className="text-foreground">{roster.data.length - Object.keys(draft).length}</strong></span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDraft(Object.fromEntries(roster.data!.map((r) => [r.id, draft[r.id] ?? 'present'])))}>
            Marcar restantes como presentes
          </Button>
          <Button size="sm" disabled={!changed.length || save.isPending}
            onClick={() => save.mutate(changed.map((r) => ({ student_id: r.id, status: draft[r.id] })), {
              onSuccess: () => toast.success(`Frequência salva (${changed.length}).`),
              onError: (e) => toast.error(e.message),
            })}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Salvar {changed.length ? `(${changed.length})` : ''}
          </Button>
        </div>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {roster.data.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="h-9 w-9">{r.avatar_url && <AvatarImage src={r.avatar_url} alt="" />}<AvatarFallback>{initials(r.full_name)}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{r.full_name}</p>
                {r.attendance?.method && r.attendance.method !== 'manual' && <p className="text-xs text-muted-foreground">Check-in pelo app</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={`Presença de ${r.full_name}`}>
              {OPTIONS.map((o) => (
                <button key={o} role="radio" aria-checked={draft[r.id] === o} onClick={() => setDraft({ ...draft, [r.id]: o })}
                  className={cn('rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors', draft[r.id] === o ? TONE[o] : 'hover:bg-secondary')}>
                  {ATTENDANCE_LABEL[o]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
