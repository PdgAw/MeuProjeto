import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { JOURNEY_STATUS_LABEL, type JourneyStatus } from '@/config/labels'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { journeySummary, useJourney } from '../api'
import { JourneyTimeline } from '../components/JourneyTimeline'
import { NextLevelCard } from '../components/NextLevelCard'
import { TrackCard } from '../components/TrackCard'

const FILTERS: (JourneyStatus | 'all')[] = ['all', 'in_progress', 'upcoming', 'completed', 'blocked']

export default function JourneyPage() {
  const { user } = useAuth()
  const { data, isPending } = useJourney()
  const [filter, setFilter] = useState<JourneyStatus | 'all'>('all')
  const summary = journeySummary(data)
  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === 'all' ? data?.length ?? 0 : data?.filter((i) => i.status === f).length ?? 0]))
  const items = (data ?? []).filter((i) => filter === 'all' || i.status === filter)
  if (!user) return null

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Minha Jornada</h1>
        <p className="text-muted-foreground">
          Seus dois anos na NeoLevel{user.cohort ? ` · ${user.cohort.name}` : ''}: disciplinas, experiências, bancas e marcos.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-medium">Progresso da jornada</span>
              <span className="font-display text-2xl font-semibold tabular-nums">{summary.percent}%</span>
            </div>
            <Progress value={summary.percent} className="h-2.5" />
          </div>
          <div className="flex gap-6 text-center text-xs text-muted-foreground sm:pl-6">
            {(['completed', 'in_progress', 'upcoming'] as const).map((s) => (
              <div key={s}>
                <p className="font-display text-xl font-semibold text-foreground">{counts[s]}</p>
                {JOURNEY_STATUS_LABEL[s]}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="order-2 min-w-0 space-y-4 lg:order-1" aria-label="Linha do tempo">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === f ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary',
                )}
              >
                {f === 'all' ? 'Todos' : JOURNEY_STATUS_LABEL[f]}
                <Badge variant={filter === f ? 'accent' : 'secondary'} className="px-1.5 py-0 text-[10px]">{counts[f]}</Badge>
              </button>
            ))}
          </div>
          {isPending ? <CardSkeleton lines={5} /> : items.length ? <JourneyTimeline items={items} /> : (
            <EmptyState text="Nenhuma etapa neste filtro." />
          )}
        </section>

        <aside className="order-1 min-w-0 space-y-6 lg:order-2">
          {summary.next && <NextLevelCard item={summary.next} />}
          <TrackCard userId={user.user_id} track={user.track} editable />
        </aside>
      </div>
    </div>
  )
}
