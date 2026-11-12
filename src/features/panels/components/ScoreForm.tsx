import { Loader2, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { useMyEvaluation, useSaveEvaluation, type Criterion } from '../api'

export function ScoreForm({ submissionId, userId, criteria }: { submissionId: string; userId: string; criteria: Criterion[] }) {
  const mine = useMyEvaluation(submissionId, userId)
  const save = useSaveEvaluation()
  const [scores, setScores] = useState<Record<string, { score: number | null; comment: string }>>({})
  const [comment, setComment] = useState('')
  const list = [...criteria].sort((a, b) => a.sort_order - b.sort_order)
  useEffect(() => {
    if (mine.isPending) return
    setScores(Object.fromEntries(list.map((c) => {
      const s = mine.data?.pitch_scores.find((x) => x.criterion_id === c.id)
      return [c.id, { score: s ? Number(s.score) : null, comment: s?.comment ?? '' }]
    })))
    setComment(mine.data?.general_comment ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine.isPending, mine.data, criteria])
  if (mine.isPending) return <CardSkeleton />
  const submitted = Boolean(mine.data?.submitted_at)
  const filled = list.filter((c) => scores[c.id]?.score !== null && scores[c.id]?.score !== undefined)
  const totalW = list.reduce((s, c) => s + Number(c.weight), 0)
  const preview = filled.length === list.length && totalW
    ? (list.reduce((s, c) => s + (scores[c.id].score! / Number(c.max_score)) * 10 * Number(c.weight), 0) / totalW).toFixed(2) : null

  const send = (submit: boolean) => {
    if (submit && filled.length < list.length) return toast.error('Dê nota a todos os critérios antes de enviar.')
    save.mutate({ submissionId, userId, comment, submit, scores: filled.map((c) => ({ criterion_id: c.id, score: scores[c.id].score!, comment: scores[c.id].comment })) }, {
      onSuccess: () => toast.success(submit ? 'Avaliação enviada à coordenação.' : 'Rascunho salvo.'), onError: (e) => toast.error(e.message),
    })
  }
  return (
    <div className="space-y-4">
      {submitted && <Badge variant="success">Avaliação enviada — você ainda pode ajustar até a banca ser encerrada</Badge>}
      <ul className="space-y-4">
        {list.map((c) => {
          const v = scores[c.id] ?? { score: null, comment: '' }
          return (
            <li key={c.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{c.name} <span className="text-xs font-normal text-muted-foreground">· peso {Number(c.weight)}</span></p>
                <span className="font-display text-xl font-semibold tabular-nums">{v.score ?? '—'}<span className="text-xs text-muted-foreground">/{Number(c.max_score)}</span></span>
              </div>
              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              <div className="mt-2 grid grid-cols-11 gap-1" role="radiogroup" aria-label={`Nota para ${c.name}`}>
                {Array.from({ length: Number(c.max_score) + 1 }, (_, i) => i).map((i) => (
                  <button key={i} type="button" role="radio" aria-checked={v.score === i} onClick={() => setScores({ ...scores, [c.id]: { ...v, score: i } })}
                    className={`rounded-md border py-1.5 text-xs font-medium tabular-nums ${v.score === i ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{i}</button>
                ))}
              </div>
              <Textarea rows={1} className="mt-2 min-h-9" placeholder="Comentário sobre este critério (opcional)" value={v.comment}
                onChange={(e) => setScores({ ...scores, [c.id]: { ...v, comment: e.target.value } })} aria-label={`Comentário sobre ${c.name}`} />
            </li>
          )
        })}
      </ul>
      <Textarea rows={3} placeholder="Comentário geral para a coordenação" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Comentário geral" />
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{preview ? <>Sua nota ponderada: <strong className="text-foreground">{preview}</strong> / 10</> : `${filled.length} de ${list.length} critérios avaliados`}</p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={save.isPending} onClick={() => send(false)}>Salvar rascunho</Button>
          <Button disabled={save.isPending} onClick={() => send(true)}>{save.isPending ? <Loader2 className="animate-spin" /> : <Send />}Enviar avaliação</Button>
        </div>
      </div>
    </div>
  )
}
