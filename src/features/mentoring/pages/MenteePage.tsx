import { ArrowLeft, Briefcase, Building2, CalendarPlus, MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { stageLabel, TRACK_LABEL } from '@/config/labels'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { NeoProgressCard } from '@/features/dashboard/neoleader/NeoProgressCard'
import { useFamilyBusiness } from '@/features/ventures/api'
import { initials } from '@/lib/utils'
import { useMentorMentees, useSessions } from '../api'
import { ActionItemsPanel } from '../components/ActionItemsPanel'
import { GoalsPanel } from '../components/GoalsPanel'
import { MENTEE_FLAG } from '../components/labels'
import { PrivateNotesPanel } from '../components/PrivateNotesPanel'
import { ScheduleSessionDialog } from '../components/ScheduleSessionDialog'
import { SessionRow } from './SessionRow'

/** Neomentor's view of one mentee: progress, goals, next steps, sessions, private notes, venture. */
export default function MenteePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const mentees = useMentorMentees()
  const sessions = useSessions({ studentId: id, mentorId: user?.user_id })
  const family = useFamilyBusiness(id)
  const [scheduling, setScheduling] = useState(false)
  if (!user || !id) return null
  if (mentees.isPending) return <CardSkeleton lines={4} />
  const m = mentees.data?.find((x) => x.student_id === id)
  if (!m) return <p className="text-muted-foreground">Este Neoleader não está vinculado a você.</p>

  return (
    <div className="space-y-6">
      <Link to="/neomentor/neoleaders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Meus Neoleaders</Link>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">{m.avatar_url && <AvatarImage src={m.avatar_url} alt="" />}<AvatarFallback className="text-lg">{initials(m.full_name)}</AvatarFallback></Avatar>
          <div>
            <h1 className="text-2xl font-semibold">{m.full_name}</h1>
            <p className="text-muted-foreground">{m.track ? TRACK_LABEL[m.track] : ''}{m.cohort_name ? ` · ${m.cohort_name}` : ''}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">{m.focus && <Badge variant="secondary">Foco: {m.focus}</Badge>}{m.flags.map((f) => <Badge key={f} variant="warning">{MENTEE_FLAG[f]}</Badge>)}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setScheduling(true)}><CalendarPlus /> Agendar mentoria</Button>
          <Button variant="outline" asChild><Link to="/chat"><MessagesSquare /> Conversar</Link></Button>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          {m.venture_id ? (
            <SectionCard title="Negócio" icon={<Briefcase className="h-4 w-4 text-primary" />} action={{ label: 'Abrir negócio', to: `/negocios/${m.venture_id}` }}>
              <p className="font-display text-lg font-semibold">{m.venture_name}</p>
              <p className="text-sm text-muted-foreground">Estágio: {m.venture_stage && stageLabel(m.venture_stage)} · comente no Plano de Execução para orientar a próxima etapa.</p>
            </SectionCard>
          ) : family.data ? (
            <SectionCard title="Empresa familiar" icon={<Building2 className="h-4 w-4 text-primary" />}>
              <p className="font-display text-lg font-semibold">{family.data.company_name}</p>
              <p className="text-sm text-muted-foreground">{[family.data.sector, family.data.generation, family.data.current_position && `Hoje: ${family.data.current_position}`, family.data.future_position && `Futuro: ${family.data.future_position}`].filter(Boolean).join(' · ')}</p>
              {family.data.succession_notes && <p className="mt-2 text-sm">{family.data.succession_notes}</p>}
            </SectionCard>
          ) : null}
          <SectionCard title="Próximos passos"><ActionItemsPanel studentId={id} canAdd={false} /></SectionCard>
          <SectionCard title="Sessões">
            {sessions.isPending ? <CardSkeleton /> : !sessions.data?.length ? <EmptyState text="Nenhuma sessão ainda." /> : <ul className="-mx-5 divide-y">{sessions.data.map((s) => <SessionRow key={s.id} s={s} viewer="mentor" />)}</ul>}
          </SectionCard>
          <SectionCard title="Metas"><GoalsPanel ownerId={id} source="mentoring" /></SectionCard>
        </div>
        <div className="space-y-6">
          <NeoProgressCard studentId={id} compact />
          <SectionCard title="Notas privadas"><PrivateNotesPanel studentId={id} /></SectionCard>
        </div>
      </div>
      <ScheduleSessionDialog open={scheduling} onOpenChange={setScheduling} mentorId={user.user_id} mentees={[{ id, name: m.full_name }]} />
    </div>
  )
}
