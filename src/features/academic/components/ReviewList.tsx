import { ChevronDown, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/SectionCard'
import { fmtWhen } from '@/lib/format'
import { openStoredFile } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { useReviewSubmission, type Submission } from '../api'
import { SUBMISSION_LABEL } from './subject/shared'

export function ReviewList({ assignmentId, submissions, maxScore }: { assignmentId: string; submissions: Submission[]; maxScore: number | null }) {
  if (!submissions.length) return <EmptyState text="Nenhuma entrega recebida ainda." />
  return <ul className="space-y-3">{submissions.map((s) => <ReviewItem key={s.id} assignmentId={assignmentId} s={s} maxScore={maxScore} />)}</ul>
}

function ReviewItem({ assignmentId, s, maxScore }: { assignmentId: string; s: Submission; maxScore: number | null }) {
  const review = useReviewSubmission(assignmentId)
  const [open, setOpen] = useState(s.status === 'submitted' || s.status === 'late')
  const [score, setScore] = useState(s.score?.toString() ?? '')
  const [feedback, setFeedback] = useState(s.feedback ?? '')
  const done = s.status === 'reviewed'
  const save = (returnToStudent: boolean) => {
    const n = score === '' ? null : Number(score)
    if (n !== null && maxScore !== null && (n < 0 || n > maxScore)) return toast.error(`Nota entre 0 e ${maxScore}.`)
    review.mutate({ id: s.id, score: n, feedback, returnToStudent }, {
      onSuccess: () => { toast.success(returnToStudent ? 'Devolvida para ajuste.' : 'Avaliação salva.'); setOpen(false) },
      onError: (e) => toast.error(e.message),
    })
  }
  return (
    <li className="rounded-lg border bg-card">
      <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(!open)}>
        <div className="min-w-0 flex-1"><p className="font-medium">{s.student?.full_name}</p><p className="text-xs text-muted-foreground">{s.submitted_at && fmtWhen(s.submitted_at)}</p></div>
        <Badge variant={done ? 'success' : s.status === 'late' ? 'warning' : s.status === 'returned' ? 'secondary' : 'default'}>{SUBMISSION_LABEL[s.status]}{s.score !== null ? ` · ${s.score}` : ''}</Badge>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-4 border-t px-4 py-4">
          {s.content && <p className="whitespace-pre-line text-sm">{s.content}</p>}
          {s.link_url && <a href={s.link_url} target="_blank" rel="noreferrer" className="block truncate text-sm text-primary hover:underline">{s.link_url}</a>}
          {s.files.map((f) => (
            <button key={f.path} onClick={() => void openStoredFile('submissions', f.path).catch((e) => toast.error(e.message))}
              className="flex items-center gap-2 text-sm text-primary hover:underline"><Paperclip className="h-4 w-4" />{f.name}</button>
          ))}
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <Input type="number" placeholder={maxScore ? `Nota /${maxScore}` : 'Nota'} value={score} onChange={(e) => setScore(e.target.value)} aria-label="Nota" />
            <Textarea rows={2} placeholder="Feedback para o Neoleader" value={feedback} onChange={(e) => setFeedback(e.target.value)} aria-label="Feedback" />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={review.isPending} onClick={() => save(true)}>Devolver para ajuste</Button>
            <Button disabled={review.isPending} onClick={() => save(false)}>Salvar avaliação</Button>
          </div>
        </div>
      )}
    </li>
  )
}
