import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useMyAttendanceMap, useSubjectAssignments, useSubjectLessons, useSubjectResults } from '../../api'

/** Teacher/staff: per-Neoleader table. Neoleader: own attendance and grades. */
export function ResultsTab({ subjectId, userId, teacherView, cohortId }: { subjectId: string; userId: string; teacherView: boolean; cohortId?: string | null }) {
  return teacherView ? <ClassResults subjectId={subjectId} /> : <MyResults subjectId={subjectId} userId={userId} cohortId={cohortId} />
}

function ClassResults({ subjectId }: { subjectId: string }) {
  const { data, isPending } = useSubjectResults(subjectId)
  if (isPending) return <CardSkeleton />
  if (!data?.length) return <EmptyState text="Nenhum Neoleader nas turmas desta disciplina." />
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[36rem] text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr><th className="px-4 py-3">Neoleader</th><th className="px-4 py-3">Turma</th><th className="px-4 py-3 text-right">Frequência</th><th className="px-4 py-3 text-right">Entregas</th><th className="px-4 py-3 text-right">Média</th></tr>
        </thead>
        <tbody className="divide-y">
          {data.map((r) => (
            <tr key={r.user_id}>
              <td className="px-4 py-3 font-medium">{r.full_name}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.cohort_name}</td>
              <td className={cn('px-4 py-3 text-right tabular-nums', r.attendance_rate !== null && Number(r.attendance_rate) < 75 && 'font-semibold text-destructive')}>
                {r.attendance_rate === null ? '—' : `${Math.round(Number(r.attendance_rate))}%`}
                <span className="ml-1 text-xs text-muted-foreground">({r.lessons_attended}/{r.lessons_past})</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{r.submitted}/{r.assignments_due}</td>
              <td className="px-4 py-3 text-right tabular-nums">{r.average_score ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MyResults({ subjectId, userId, cohortId }: { subjectId: string; userId: string; cohortId?: string | null }) {
  const lessons = useSubjectLessons(subjectId)
  const past = (lessons.data ?? []).filter((l) => (!cohortId || l.cohort_id === cohortId) && l.status !== 'canceled' && new Date(l.starts_at) < new Date())
  const att = useMyAttendanceMap(past.map((l) => l.id), userId)
  const assignments = useSubjectAssignments(subjectId)
  const attended = past.filter((l) => ['present', 'late'].includes(att.data?.get(l.id) ?? '')).length
  const graded = (assignments.data ?? []).map((a) => ({ a, s: a.assignment_submissions.find((x) => x.student_id === userId) })).filter((x) => x.s?.score != null)
  if (lessons.isPending || assignments.isPending) return <CardSkeleton />
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card><CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">Frequência</p>
        <p className="font-display text-3xl font-semibold tabular-nums">{past.length ? `${Math.round((100 * attended) / past.length)}%` : '—'}</p>
        <p className="text-xs text-muted-foreground">{attended} de {past.length} aulas realizadas</p>
      </CardContent></Card>
      <Card><CardContent className="pt-5">
        <p className="mb-2 text-sm text-muted-foreground">Avaliações</p>
        {graded.length ? (
          <ul className="space-y-1.5 text-sm">
            {graded.map(({ a, s }) => <li key={a.id} className="flex justify-between gap-3"><span className="truncate">{a.title}</span><span className="font-semibold tabular-nums">{s!.score}{a.max_score ? `/${a.max_score}` : ''}</span></li>)}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Nenhuma entrega avaliada ainda.</p>}
      </CardContent></Card>
    </div>
  )
}
