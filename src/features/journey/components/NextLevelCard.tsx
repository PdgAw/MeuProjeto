import { CheckCircle2, Circle, Rocket } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { JOURNEY_KIND_LABEL } from '@/config/labels'
import { fmtDate, parseLocalDate } from '@/lib/format'
import type { JourneyItem } from '../api'

/** "Seu próximo nível" — what is missing to reach the next milestone. */
export function NextLevelCard({ item }: { item: JourneyItem }) {
  const met = item.requirements.filter((r) => r.met).length
  const total = item.requirements.length
  return (
    <Card className="overflow-hidden border-primary/30">
      <div className="bg-sidebar px-5 py-4 text-sidebar-foreground">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          <Rocket className="h-3.5 w-3.5" /> Seu próximo nível
        </p>
        <p className="mt-2 font-display text-xl font-semibold">{item.title}</p>
        <p className="text-sm text-sidebar-muted">
          {JOURNEY_KIND_LABEL[item.kind]}{item.starts_on ? ` · ${fmtDate(parseLocalDate(item.starts_on))}` : ''}
        </p>
      </div>
      <CardContent className="space-y-4 pt-5">
        {total > 0 ? (
          <>
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">O que falta</span>
                <span className="tabular-nums text-muted-foreground">{met}/{total}</span>
              </div>
              <Progress value={(100 * met) / total} indicatorClassName="bg-accent" />
            </div>
            <ul className="space-y-2">
              {item.requirements.map((r) => (
                <li key={r.label} className="flex items-center gap-2.5 text-sm">
                  {r.met ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className={r.met ? 'text-muted-foreground line-through' : ''}>{r.label}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{item.description ?? 'Continue avançando na sua jornada.'}</p>
        )}
      </CardContent>
    </Card>
  )
}
