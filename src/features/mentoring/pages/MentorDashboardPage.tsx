import { AlertTriangle, CalendarClock, Inbox, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AnnouncementsCard } from '@/features/dashboard/neoleader/AnnouncementsCard'
import { fmtRelative } from '@/lib/format'
import { firstName, greeting } from '@/lib/utils'
import { useMentorMentees, useSessions } from '../api'
import { MenteeCard } from '../components/MenteeCard'
import { SessionRow } from './SessionRow'

export default function MentorDashboardPage() {
  const { user } = useAuth()
  const mentees = useMentorMentees()
  const sessions = useSessions({ mentorId: user?.user_id })
  if (!user) return null
  const list = sessions.data ?? []
  const upcoming = list.filter((s) => s.status === 'scheduled' && new Date(s.scheduled_at ?? 0) >= new Date(Date.now() - 3600e3)).reverse().slice(0, 5)
  const requests = list.filter((s) => s.status === 'requested')
  const recent = list.filter((s) => s.status === 'completed').slice(0, 4)
  const m = mentees.data ?? []
  const stale = m.filter((x) => x.flags.includes('stale_venture') || x.flags.includes('no_recent_session'))
  const openGoals = m.reduce((n, x) => n + x.open_goals, 0)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{greeting()}, {firstName(user.preferred_name || user.full_name)}.</h1>
        <p className="mt-1 text-muted-foreground">Acompanhe a evolução dos seus Neoleaders.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Meus Neoleaders" value={m.length} />
        <Stat label="Próximas mentorias" value={upcoming.length} />
        <Stat label="Metas em aberto" value={openGoals} />
        <Stat label="Solicitações" value={requests.length} highlight={requests.length > 0} />
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><UsersRound className="h-5 w-5 text-primary" />Meus Neoleaders</h2>
          <Link to="/neomentor/neoleaders" className="text-sm font-medium text-primary hover:underline">Ver todos</Link></div>
        {mentees.isPending ? <CardSkeleton lines={2} /> : !m.length ? <EmptyState text="Nenhum Neoleader vinculado a você ainda." /> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{m.map((x) => <MenteeCard key={x.student_id} m={x} />)}</div>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <SectionCard title="Próximas mentorias" icon={<CalendarClock className="h-4 w-4 text-primary" />} action={{ label: 'Mentorias', to: '/mentorias' }} className="lg:col-span-2">
          {sessions.isPending ? <CardSkeleton /> : !upcoming.length && !requests.length ? <EmptyState text="Nada agendado." /> : (
            <ul className="-mx-5 divide-y">{[...requests, ...upcoming].map((s) => <SessionRow key={s.id} s={s} viewer="mentor" />)}</ul>
          )}
        </SectionCard>
        <div className="space-y-6">
          <SectionCard title="Sem atualização" icon={<AlertTriangle className="h-4 w-4 text-warning" />}>
            {!stale.length ? <EmptyState text="Todos em dia." /> : (
              <ul className="space-y-2 text-sm">{stale.map((x) => (
                <li key={x.student_id}><Link to={`/neomentor/neoleaders/${x.student_id}`} className="block rounded-md p-2 hover:bg-secondary/50">
                  <p className="font-medium">{x.full_name}</p>
                  <p className="text-xs text-muted-foreground">Última mentoria {x.last_session_at ? fmtRelative(x.last_session_at) : 'nunca'} · projeto atualizado {x.venture_updated_at ? fmtRelative(x.venture_updated_at) : '—'}</p>
                </Link></li>
              ))}</ul>
            )}
          </SectionCard>
          <SectionCard title="Últimas sessões" icon={<Inbox className="h-4 w-4 text-primary" />}>
            {!recent.length ? <EmptyState text="Nenhuma sessão realizada." /> : <ul className="-mx-5 divide-y">{recent.map((s) => <SessionRow key={s.id} s={s} viewer="mentor" />)}</ul>}
          </SectionCard>
          <AnnouncementsCard userId={user.user_id} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return <div className="rounded-lg border bg-card p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-2 font-display text-3xl font-semibold tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</p></div>
}
