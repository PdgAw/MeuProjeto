import { CalendarDays, MapPin, Plus, Users } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useExperiences, type ExperienceCategory } from '../api'
import { ExperienceFormDialog } from '../components/ExperienceFormDialog'
import { CATEGORY, REG_STATUS } from '../components/labels'

type When = 'upcoming' | 'past' | 'mine'

export default function ExperiencesPage() {
  const { user, hasPermission } = useAuth()
  const navigate = useNavigate()
  const manage = hasPermission('events.manage')
  const { data, isPending } = useExperiences()
  const [when, setWhen] = useState<When>('upcoming')
  const [cat, setCat] = useState<ExperienceCategory | 'all'>('all')
  const [creating, setCreating] = useState(false)
  if (!user) return null
  const list = (data ?? []).filter((x) => {
    const ended = isPast(new Date(x.ends_at ?? x.starts_at))
    const mine = x.experience_registrations.find((r) => r.user_id === user.user_id && r.status !== 'canceled')
    return (when === 'upcoming' ? !ended : when === 'past' ? ended : Boolean(mine)) && (cat === 'all' || x.category === cat) && (manage || x.status !== 'draft')
  })
  if (when === 'past') list.reverse()
  const cats = [...new Set((data ?? []).map((x) => x.category))]
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Experiências Neo</h1>
          <p className="mt-1 text-muted-foreground">Visitas empresariais, Neomeetings, Conexões Neo, missões e encontros: o aprendizado fora da sala.</p></div>
        {manage && <Button onClick={() => setCreating(true)}><Plus /> Nova experiência</Button>}
      </header>
      <div className="flex flex-wrap items-center gap-2">
        {(['upcoming', 'past', 'mine'] as When[]).map((w) => (
          <button key={w} onClick={() => setWhen(w)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', when === w ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}>
            {{ upcoming: 'Próximas', past: 'Realizadas', mine: 'Minhas inscrições' }[w]}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <button onClick={() => setCat('all')} className={cn('rounded-full px-3 py-1.5 text-xs font-medium', cat === 'all' ? 'bg-secondary' : 'text-muted-foreground hover:text-foreground')}>Todas</button>
        {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={cn('rounded-full px-3 py-1.5 text-xs font-medium', cat === c ? 'bg-secondary' : 'text-muted-foreground hover:text-foreground')}>{CATEGORY[c]}</button>)}
      </div>
      {isPending ? <CardSkeleton lines={3} /> : !list.length ? <EmptyState text="Nenhuma experiência aqui." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((x) => {
            const mine = x.experience_registrations.find((r) => r.user_id === user.user_id)
            const taken = x.experience_registrations.filter((r) => r.status === 'confirmed' || r.status === 'attended').length
            return (
              <Link key={x.id} to={`/experiencias/${x.id}`} className="group">
                <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
                  <div className="relative h-28 bg-sidebar">
                    {x.cover_url ? <img src={x.cover_url} alt="" className="h-full w-full object-cover" /> : <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(var(--accent)/0.35),transparent_55%),radial-gradient(circle_at_85%_15%,hsl(var(--primary)/0.6),transparent_55%)]" />}
                    <Badge variant="accent" className="absolute left-3 top-3">{CATEGORY[x.category]}</Badge>
                    {x.status === 'draft' && <Badge variant="outline" className="absolute right-3 top-3 bg-card">Rascunho</Badge>}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="font-display font-semibold leading-snug">{x.title}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground first-letter:uppercase"><CalendarDays className="h-4 w-4" />{format(new Date(x.starts_at), "EEE, dd 'de' MMM · HH:mm", { locale: ptBR })}</p>
                    {x.location && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{x.location}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                      {mine && mine.status !== 'canceled' && <Badge variant={REG_STATUS[mine.status].variant}>{REG_STATUS[mine.status].label}</Badge>}
                      {manage && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{taken}{x.capacity ? `/${x.capacity}` : ''} confirmados</span>}
                      {!manage && x.capacity && <span className="text-xs text-muted-foreground">{x.capacity} vagas</span>}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
      <ExperienceFormDialog open={creating} onOpenChange={setCreating} onSaved={(id) => navigate(`/experiencias/${id}`)} />
    </div>
  )
}
