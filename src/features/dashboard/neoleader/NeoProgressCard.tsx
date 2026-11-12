import { Gauge } from 'lucide-react'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { overallProgress, useNeoProgress, type ProgressDimension } from '@/features/progress/api'

/**
 * Neo Progress — not a % of classes: 7 dimensions computed by the database.
 * One person, one series → a single hue. The bar list beside the radar gives exact
 * values (and is the accessible reading of the chart); "sem dados" is never shown as 0.
 */
export function NeoProgressCard({ studentId, compact = false }: { studentId?: string; compact?: boolean }) {
  const { data, isPending } = useNeoProgress(studentId)
  const overall = overallProgress(data)

  return (
    <SectionCard title="Neo Progress" icon={<Gauge className="h-4 w-4 text-primary" />}>
      {isPending ? (
        <CardSkeleton lines={4} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl font-semibold tabular-nums">{overall ?? '—'}</span>
            <span className="pb-1.5 text-sm text-muted-foreground">/ 100 · evolução geral</span>
          </div>
          {!compact && <ProgressRadar dims={data ?? []} />}
          <ul className="space-y-2.5" aria-label="Dimensões do Neo Progress">
            {(data ?? []).map((d) => (
              <li key={d.dimension} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground" title={d.label}>{d.label}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  {d.score !== null && (
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(Number(d.score), 2)}%` }} />
                  )}
                </div>
                <span className="text-right text-xs font-medium tabular-nums">
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
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="hsl(var(--primary))"
            fillOpacity={0.15}
            dot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
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
