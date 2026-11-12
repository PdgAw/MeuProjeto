import { ArrowLeft, CalendarClock, MessageSquareQuote, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtWhen } from '@/lib/format'
import { useAssignment, useMySubmission, useSubject, useSubmissions } from '../api'
import { AssignmentFormDialog } from '../components/AssignmentFormDialog'
import { ReviewList } from '../components/ReviewList'
import { SubmissionForm } from '../components/SubmissionForm'
import { SUBMISSION_LABEL } from '../components/subject/shared'

export default function AssignmentPage() {
  const { id } = useParams()
  const { user, hasPermission } = useAuth()
  const { data: a, isPending } = useAssignment(id)
  const subject = useSubject(a?.subject_id)
  const canTeach = hasPermission('subjects.manage') || Boolean(subject.data?.subject_teachers.some((t) => t.teacher?.id === user?.user_id))
  const mine = useMySubmission(id, canTeach ? undefined : user?.user_id)
  const all = useSubmissions(id, canTeach)
  const [editing, setEditing] = useState(false)
  if (!user) return null
  if (isPending) return <CardSkeleton lines={4} />
  if (!a) return <p className="text-muted-foreground">Atividade não encontrada ou sem acesso.</p>

  const overdue = a.due_at && new Date(a.due_at) < new Date()
  const sub = mine.data
  const locked = a.status === 'closed' || (sub ? ['submitted', 'late', 'reviewed'].includes(sub.status) : false)
  const cohorts = subject.data?.subject_cohorts.map((c) => c.cohort).filter((c): c is { id: string; name: string } => Boolean(c)) ?? []

  return (
    <div className="space-y-6">
      <Link to={`/disciplinas/${a.subject_id}?aba=entregas`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{a.subject?.name}</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{a.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />{a.due_at ? `Prazo: ${fmtWhen(a.due_at)}` : 'Sem prazo'}
            {overdue && <Badge variant="destructive">Prazo encerrado</Badge>}
            {a.max_score && <Badge variant="secondary">Nota máx. {a.max_score}</Badge>}
          </p>
        </div>
        {canTeach && <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Editar</Button>}
      </header>

      {a.instructions && <Card><CardContent className="whitespace-pre-line pt-5 leading-relaxed">{a.instructions}</CardContent></Card>}

      {canTeach ? (
        <SectionCard title={`Entregas recebidas (${all.data?.length ?? 0})`}>
          {all.isPending ? <CardSkeleton /> : <ReviewList assignmentId={a.id} submissions={all.data ?? []} maxScore={a.max_score} />}
        </SectionCard>
      ) : (
        <>
          {sub && (sub.status === 'reviewed' || sub.status === 'returned') && (
            <Card className="border-primary/30"><CardContent className="space-y-2 pt-5">
              <p className="flex items-center gap-2 font-semibold"><MessageSquareQuote className="h-4 w-4 text-primary" />Avaliação do professor</p>
              {sub.score !== null && <p className="font-display text-2xl font-semibold">{sub.score}{a.max_score ? ` / ${a.max_score}` : ''}</p>}
              {sub.feedback && <p className="whitespace-pre-line text-sm">{sub.feedback}</p>}
              {sub.status === 'returned' && <Badge variant="warning">Ajuste solicitado: edite e envie novamente</Badge>}
            </CardContent></Card>
          )}
          <SectionCard title={<span className="flex items-center gap-2">Minha entrega {sub && <Badge variant="secondary">{SUBMISSION_LABEL[sub.status]}</Badge>}</span>}>
            {mine.isPending ? <CardSkeleton /> : <SubmissionForm assignmentId={a.id} userId={user.user_id} existing={sub ?? null} locked={locked} />}
          </SectionCard>
        </>
      )}
      <AssignmentFormDialog open={editing} onOpenChange={setEditing} subjectId={a.subject_id} cohorts={cohorts}
        assignment={{ ...a, max_score: a.max_score === null ? null : Number(a.max_score) }} />
    </div>
  )
}
