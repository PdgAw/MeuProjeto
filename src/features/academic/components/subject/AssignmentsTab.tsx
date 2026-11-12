import { ChevronRight, ClipboardList, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { fmtWhen } from '@/lib/format'
import { useSubjectAssignments } from '../../api'
import { AssignmentFormDialog } from '../AssignmentFormDialog'
import { SUBMISSION_LABEL } from './shared'

export function AssignmentsTab({ subjectId, userId, canTeach, cohorts }: {
  subjectId: string; userId: string; canTeach: boolean; cohorts: { id: string; name: string }[]
}) {
  const { data, isPending } = useSubjectAssignments(subjectId)
  const [creating, setCreating] = useState(false)
  return (
    <div className="space-y-4">
      {canTeach && <div className="flex justify-end"><Button onClick={() => setCreating(true)}><Plus /> Nova atividade</Button></div>}
      {isPending ? <CardSkeleton /> : !data?.length ? <EmptyState text="Nenhuma atividade." /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {data.map((a) => {
            const mine = a.assignment_submissions.find((s) => s.student_id === userId)
            const delivered = a.assignment_submissions.filter((s) => s.status !== 'draft').length
            const overdue = a.due_at && new Date(a.due_at) < new Date() && (!mine || mine.status === 'draft')
            return (
              <li key={a.id}>
                <Link to={`/entregas/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40">
                  <ClipboardList className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.due_at ? `Prazo: ${fmtWhen(a.due_at)}` : 'Sem prazo'}</p>
                  </div>
                  {canTeach ? (
                    <>
                      {a.status !== 'published' && <Badge variant="outline">{a.status === 'draft' ? 'Rascunho' : 'Encerrada'}</Badge>}
                      <Badge variant="secondary">{delivered} entregas</Badge>
                    </>
                  ) : mine && mine.status !== 'draft' ? (
                    <Badge variant={mine.status === 'returned' ? 'warning' : 'success'}>
                      {SUBMISSION_LABEL[mine.status]}{mine.score !== null ? ` · ${mine.score}` : ''}
                    </Badge>
                  ) : (
                    <Badge variant={overdue ? 'destructive' : 'warning'}>{overdue ? 'Atrasada' : 'Pendente'}</Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <AssignmentFormDialog open={creating} onOpenChange={setCreating} subjectId={subjectId} cohorts={cohorts} />
    </div>
  )
}
