import { Gauge } from 'lucide-react'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { overallProgress, useNeoProgress, type ProgressDimension } from '@/features/progress/api'
import { cn } from '@/lib/utils'

/** One hue per dimension (brand manual tokens dim-*), shared with charts and badges. */
const DIM_BG: Record<ProgressDimension['dimension'], string> = {
  learning: 'bg-dim-learning', execution: 'bg-dim-execution', mentoring: 'bg-dim-mentoring', participation: 'bg-dim-participation',
  venture: 'bg-dim-venture', experiences: 'bg-dim-experiences', goals: 'bg-dim-goals',
}

/**
 * Neo Progress — not a % of classes: 7 dimensions computed by the database.
 * One person, one series → a single hue. The bar list beside the radar gives exact
 * values (and is the accessible reading of the chart); "sem dados" is never shown as 0.
 */
export function NeoProgressCard({ studentId, compact = false }: { studentId?: string; compact?: boolean }) {
  const { data, isPending } = useNeoProgress(studentId)
  const overall = overallProgress(data)

  return (
    <SectionCard title="Neo Progress" icon={<Gauge />} className="glow-neo border-primary/30">
      {isPending ? (
        <CardSkeleton lines={4} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <span className="font-display text-5xl font-bold leading-none tabular-nums text-primary">{overall ?? '—'}</span>
            <span className="pb-1 text-sm text-muted-foreground">/ 100 · evolução geral</span>
          </div>
          <FocusHint dims={data ?? []} />
          {!compact && <ProgressRadar dims={data ?? []} />}
          <ul className="space-y-2.5" aria-label="Dimensões do Neo Progress">
            {(data ?? []).map((d) => (
              <li key={d.dimension} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground" title={d.label}>{d.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  {d.score !== null && (
                    <div className={cn('h-full rounded-full', DIM_BG[d.dimension])} style={{ width: `${Math.max(Number(d.score), 2)}%` }} />
                  )}
                </div>
                <span className="text-right font-display text-xs font-bold tabular-nums text-foreground">
                  {d.score === null ? <span className="text-muted-foreground">s/ dados</span> : Math.round(Number(d.score))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}

function ProgressRadar({ dims }: { dims: ProgressDimension[] }) {
  const chartData = dims.map((d) => ({ label: d.label, value: d.score === null ? 0 : Number(d.score), hasData: d.score !== null }))
  return (
    <div className="h-56 w-full" role="img" aria-label="Radar das dimensões do Neo Progress (valores na lista abaixo)">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} outerRadius="72%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="hsl(var(--primary-text))"
            strokeWidth={2}
            fill="hsl(var(--primary-text))"
            fillOpacity={0.16}
            dot={{ r: 4, fill: 'hsl(var(--primary-text))', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { label: string; value: number; hasData: boolean } | undefined
              if (!active || !p) return null
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{p.label}</p>
                  <p className="text-muted-foreground">{p.hasData ? `${Math.round(p.value)} / 100` : 'Sem dados ainda'}</p>
                </div>
              )
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** "Ponto forte / próximo foco": turns the chart into a concrete next step. */
function FocusHint({ dims }: { dims: ProgressDimension[] }) {
  const scored = dims.filter((d) => d.score !== null).sort((a, b) => Number(b.score) - Number(a.score))
  if (scored.length < 2) return null
  const best = scored[0]
  const next = scored[scored.length - 1]
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-md bg-secondary/70 px-3 py-2">
        <p className="text-muted-foreground">Ponto forte</p>
        <p className="mt-0.5 truncate font-semibold text-foreground">{best.label}</p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2">
        <p className="text-muted-foreground">Próximo foco</p>
        <p className="mt-0.5 truncate font-semibold text-primary">{next.label}</p>
      </div>
    </div>
  )
}
