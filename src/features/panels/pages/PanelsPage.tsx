import { CalendarClock, ChevronRight, Presentation, Users } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { usePrimaryVenture } from '@/features/ventures/api'
import { useMyPitches, useRounds } from '../api'
import { PITCH_STATUS } from '../components/labels'
import { PitchStatusTrack } from '../components/PitchStatusTrack'

const when = (d: string | null) => (d ? format(new Date(d), "dd 'de' MMM 'às' HH:mm", { locale: ptBR }) : 'a definir')

/** Neoleader: open panels and own pitches. Scores are never shown here (confidential). */
export default function PanelsPage() {
  const { user } = useAuth()
  const rounds = useRounds()
  const pitches = useMyPitches(user?.user_id)
  const venture = usePrimaryVenture(user?.user_id)
  if (!user) return null
  const open = (rounds.data ?? []).filter((r) => r.status === 'open')
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Bancas e Venture Capital</h1>
        <p className="mt-1 text-muted-foreground">Apresente seu negócio para a banca NeoLevel e investidores convidados.</p></header>

      <SectionCard title="Meus pitches" icon={<Presentation className="h-4 w-4 text-primary" />}>
        {pitches.isPending ? <CardSkeleton /> : !pitches.data?.length ? <EmptyState text="Você ainda não submeteu nenhum pitch." /> : (
          <ul className="space-y-3">
            {pitches.data.map((p) => (
              <li key={p.id}>
                <Link to={`/bancas/${p.round_id}/pitch`} className="block rounded-lg border p-4 hover:bg-secondary/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-semibold">{p.round?.name}</p><p className="text-sm text-muted-foreground">{p.venture?.name}</p></div>
                    <Badge variant={PITCH_STATUS[p.status].variant}>{PITCH_STATUS[p.status].label}</Badge>
                  </div>
                  <div className="mt-3"><PitchStatusTrack status={p.status} /></div>
                  {p.panel_at && <p className="mt-2 flex items-center gap-1.5 text-sm"><CalendarClock className="h-4 w-4 text-primary" />Sua apresentação: {when(p.panel_at)}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Bancas com inscrições abertas</h2>
        {rounds.isPending ? <CardSkeleton /> : !open.length ? <EmptyState text="Nenhuma banca aberta no momento." /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {open.map((r) => {
              const mine = pitches.data?.find((p) => p.round_id === r.id)
              return (
                <Card key={r.id} className="flex flex-col gap-3 p-5">
                  <div><p className="font-display text-lg font-semibold">{r.name}</p>{r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}</div>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground" />Inscrições até {when(r.submissions_close_at)}</p>
                    <p className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Banca: {when(r.panel_date)}{r.location ? ` · ${r.location}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{r.panel_criteria.length} critérios de avaliação</p>
                  </div>
                  {!venture.data ? (
                    <Button variant="outline" asChild className="mt-auto"><Link to="/meu-negocio">Cadastre seu negócio para participar</Link></Button>
                  ) : (
                    <Button asChild className="mt-auto"><Link to={`/bancas/${r.id}/pitch`}>{mine ? 'Ver meu pitch' : 'Preparar pitch'} <ChevronRight /></Link></Button>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
