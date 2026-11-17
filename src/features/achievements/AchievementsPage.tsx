import { Award, Briefcase, CalendarCheck, Compass, Flag, Handshake, Lightbulb, Lock, Mountain, Network, Presentation, Repeat, Rocket, Sparkles, Target, TrendingUp, Trophy, type LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { cn } from '@/lib/utils'
import { useAchievements } from './api'

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles, repeat: Repeat, 'calendar-check': CalendarCheck, mountain: Mountain, compass: Compass, lightbulb: Lightbulb,
  briefcase: Briefcase, rocket: Rocket, 'trending-up': TrendingUp, handshake: Handshake, flag: Flag, target: Target,
  presentation: Presentation, trophy: Trophy, network: Network,
}

/** Conquistas — computed from the Neoleader's real activity (nothing awarded by hand). */
export default function AchievementsPage() {
  const { data, isPending } = useAchievements()
  if (isPending) return <CardSkeleton lines={4} />
  const list = data ?? []
  const unlocked = list.filter((a) => a.unlocked).length
  const categories = [...new Set(list.map((a) => a.category))]
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow mb-2">Sua evolução</p><h1 className="text-[1.75rem] font-bold leading-tight sm:text-[2rem]">Conquistas</h1><p className="mt-1 text-muted-foreground">Marcos da sua evolução como empreendedor e líder.</p></div>
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5"><Award className="h-7 w-7 text-primary" /><p className="leading-none"><span className="font-display text-3xl font-bold tabular-nums text-primary">{unlocked}</span><span className="text-muted-foreground"> / {list.length}</span><span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">conquistadas</span></p></div>
      </header>
      {categories.map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="eyebrow">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.filter((a) => a.category === cat).map((a) => {
              const Icon = ICONS[a.icon] ?? Award
              return (
                <Card key={a.key} className={cn('flex gap-4 p-4 transition-colors', a.unlocked ? 'border-primary/30' : 'bg-muted/40 shadow-none')}>
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', a.unlocked ? 'bg-primary/12 text-primary ring-1 ring-inset ring-primary/30' : 'bg-secondary text-muted-foreground')}>
                    {a.unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={cn('font-semibold', !a.unlocked && 'text-muted-foreground')}>{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    {a.unlocked ? (
                      a.unlocked_at && <p className="text-xs font-medium text-success">Conquistado em {format(new Date(a.unlocked_at), "dd 'de' MMM yyyy", { locale: ptBR })}</p>
                    ) : a.target_value > 1 ? (
                      <div className="flex items-center gap-2 pt-1"><Progress value={(100 * a.current_value) / a.target_value} className="h-1.5" /><span className="text-xs tabular-nums text-muted-foreground">{a.current_value}/{a.target_value}</span></div>
                    ) : null}
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
