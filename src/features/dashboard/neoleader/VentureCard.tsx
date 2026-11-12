import { Briefcase, Flag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { VENTURE_STAGES } from '@/config/labels'
import { usePrimaryVenture } from '@/features/ventures/api'
import { fmtRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Progresso do projeto empresarial: stage stepper + milestones. */
export function VentureCard({ userId }: { userId: string }) {
  const { data: v, isPending } = usePrimaryVenture(userId)
  const stageIdx = v ? VENTURE_STAGES.findIndex((s) => s.key === v.stage) : -1
  const achieved = v?.venture_milestones.filter((m) => m.status === 'achieved').length ?? 0
  const nextMilestone = v?.venture_milestones.filter((m) => m.status === 'pending').sort((a, b) => a.sort_order - b.sort_order)[0]

  return (
    <SectionCard title="Meu Negócio" icon={<Briefcase className="h-4 w-4 text-primary" />} action={v ? { label: 'Abrir', to: '/meu-negocio' } : undefined}>
      {isPending ? <CardSkeleton lines={2} /> : !v ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Cadastre seu projeto empresarial para acompanhar estágio, KPIs e milestones.</p>
          <Button size="sm" asChild><Link to="/meu-negocio">Cadastrar meu negócio</Link></Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="font-display text-lg font-semibold">{v.name}</p>
            {v.tagline && <p className="text-sm text-muted-foreground">{v.tagline}</p>}
          </div>
          <div>
            <ol className="grid grid-cols-6 gap-1" aria-label="Estágio do negócio">
              {VENTURE_STAGES.map((s, i) => (
                <li key={s.key} className={cn('h-1.5 rounded-full', i <= stageIdx ? 'bg-primary' : 'bg-secondary')} title={s.label} />
              ))}
            </ol>
            <div className="mt-2 flex justify-between text-xs">
              <span className="font-medium">Estágio: {VENTURE_STAGES[stageIdx]?.label}</span>
              <span className="text-muted-foreground">{stageIdx + 1}/6</span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Flag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p>{achieved} de {v.venture_milestones.length} milestones</p>
              {nextMilestone && <p className="text-xs text-muted-foreground">Próximo: {nextMilestone.title}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Atualizado {fmtRelative(v.last_update_at)}</p>
        </div>
      )}
    </SectionCard>
  )
}
