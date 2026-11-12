import { CheckCircle2, ChevronRight, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { stageLabel } from '@/config/labels'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useMyEvaluationQueue } from '../api'

/** Evaluator's queue across the panels they sit on. */
export default function EvaluationsPage() {
  const { user } = useAuth()
  const { data, isPending } = useMyEvaluationQueue(user?.user_id)
  const pending = (data ?? []).filter((s) => !s.mine?.submitted_at).length
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Avaliações de banca</h1>
        <p className="mt-1 text-muted-foreground">{pending ? `${pending} pitch${pending > 1 ? 'es' : ''} aguardando sua avaliação.` : 'Pitches das bancas em que você é avaliador.'}</p></header>
      {isPending ? <CardSkeleton lines={3} /> : !data?.length ? <EmptyState text="Nenhum pitch para avaliar. Você verá aqui os pitches das bancas em que for avaliador." /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {data.map((s) => (
            <li key={s.id}>
              <Link to={`/avaliacoes/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.venture?.name} <span className="font-normal text-muted-foreground">· {s.venture?.owner?.full_name}</span></p>
                  <p className="text-xs text-muted-foreground">{s.round?.name}{s.venture?.stage ? ` · ${stageLabel(s.venture.stage)}` : ''}</p>
                </div>
                {s.mine?.submitted_at ? <Badge variant="success"><CheckCircle2 className="h-3 w-3" />Avaliado</Badge> : s.mine ? <Badge variant="warning"><Clock className="h-3 w-3" />Rascunho</Badge> : <Badge>Pendente</Badge>}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
