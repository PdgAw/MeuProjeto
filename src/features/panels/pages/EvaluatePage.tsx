import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { usePitch } from '../api'
import { PitchView } from '../components/PitchView'
import { ScoreForm } from '../components/ScoreForm'

export default function EvaluatePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: p, isPending } = usePitch(id)
  if (!user) return null
  if (isPending) return <CardSkeleton lines={5} />
  if (!p) return <p className="text-muted-foreground">Pitch não encontrado ou você não é avaliador desta banca.</p>
  return (
    <div className="space-y-6">
      <Link to="/avaliacoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Avaliações</Link>
      <header><p className="text-sm text-muted-foreground">{p.round?.name}</p><h1 className="text-2xl font-semibold sm:text-3xl">Avaliar pitch</h1></header>
      <div className="grid gap-6 xl:grid-cols-[1fr_28rem] [&>*]:min-w-0">
        <PitchView pitch={p} />
        <SectionCard title="Sua avaliação" className="h-fit xl:sticky xl:top-20">
          <ScoreForm submissionId={p.id} userId={user.user_id} criteria={p.round?.panel_criteria ?? []} />
        </SectionCard>
      </div>
    </div>
  )
}
