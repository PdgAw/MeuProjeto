import { Lock, Route } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { JOURNEY_KIND_LABEL } from '@/config/labels'
import { journeySummary, useJourney } from '@/features/journey/api'
import { fmtDate, parseLocalDate } from '@/lib/format'

export function JourneyCard() {
  const { data, isPending } = useJourney()
  const { percent, done, total, next } = journeySummary(data)
  const met = next?.requirements.filter((r) => r.met).length ?? 0

  return (
    <SectionCard title="Minha Jornada" icon={<Route className="h-4 w-4 text-primary" />} action={{ label: 'Ver jornada', to: '/jornada' }}>
      {isPending ? <CardSkeleton lines={2} /> : (
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-display text-2xl font-semibold tabular-nums">{percent}%</span>
              <span className="text-xs text-muted-foreground">{done} de {total} etapas</span>
            </div>
            <Progress value={percent} />
          </div>
          {next && (
            <div className="rounded-lg bg-secondary/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu próximo nível</p>
              <p className="mt-1 font-medium">{next.title}</p>
              <p className="text-xs text-muted-foreground">
                {JOURNEY_KIND_LABEL[next.kind]}{next.starts_on ? ` · ${fmtDate(parseLocalDate(next.starts_on))}` : ''}
              </p>
              {next.requirements.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs">
                  <Lock className="h-3 w-3" /> {met} de {next.requirements.length} requisitos atendidos
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}
