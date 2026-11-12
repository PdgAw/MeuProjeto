import { MessagesSquare, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { initials } from '@/lib/utils'
import { useMentorMentees, useMyMentors, useSessions } from '../api'
import { ActionItemsPanel } from '../components/ActionItemsPanel'
import { GoalsPanel } from '../components/GoalsPanel'
import { RequestMentoringDialog } from '../components/RequestMentoringDialog'
import { ScheduleSessionDialog } from '../components/ScheduleSessionDialog'
import { SessionRow } from './SessionRow'

export default function MentoringPage() {
  const { user } = useAuth()
  if (!user) return null
  return user.dashboard === 'mentor' ? <MentorView userId={user.user_id} /> : <StudentView userId={user.user_id} />
}

function StudentView({ userId }: { userId: string }) {
  const mentors = useMyMentors(userId)
  const sessions = useSessions({ studentId: userId })
  const [requesting, setRequesting] = useState<string | null>(null)
  const list = sessions.data ?? []
  const upcoming = list.filter((s) => s.status === 'requested' || (s.status === 'scheduled' && new Date(s.scheduled_at ?? 0) >= new Date(Date.now() - 3600e3))).reverse()
  const history = list.filter((s) => !upcoming.includes(s))
  const mentorOptions = (mentors.data ?? []).map((m) => m.mentor).filter((m): m is NonNullable<typeof m> => Boolean(m))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Neomentoria</h1><p className="mt-1 text-muted-foreground">Seus Neomentores, sessões, metas e plano de ação.</p></div>
        {mentorOptions.length > 0 && <Button onClick={() => setRequesting(mentorOptions[0].id)}><Plus /> Solicitar mentoria</Button>}
      </header>

      {mentors.isPending ? <CardSkeleton lines={1} /> : !mentorOptions.length ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Você ainda não tem um Neomentor vinculado. A coordenação fará o vínculo em breve.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {mentors.data!.map(({ id, focus, mentor: m }) => m && (
            <Card key={id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <Avatar className="h-14 w-14">{m.avatar_url && <AvatarImage src={m.avatar_url} alt="" />}<AvatarFallback>{initials(m.full_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <Link to={`/professores/${m.id}`} className="font-semibold hover:underline">{m.full_name}</Link>
                <p className="text-sm text-muted-foreground">{[m.professional_profiles?.position, m.professional_profiles?.company].filter(Boolean).join(' · ') || m.job_title}</p>
                {focus && <p className="mt-1 text-xs">Foco: <span className="font-medium">{focus}</span></p>}
                <div className="mt-2 flex flex-wrap gap-1">{m.professional_profiles?.specialties.slice(0, 3).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
              </div>
              <div className="flex gap-2 sm:flex-col">
                <Button size="sm" onClick={() => setRequesting(m.id)}><Sparkles /> Solicitar</Button>
                <Button size="sm" variant="outline" asChild><Link to="/chat"><MessagesSquare /> Conversar</Link></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <SectionCard title="Próximas mentorias">
            {sessions.isPending ? <CardSkeleton /> : !upcoming.length ? <EmptyState text="Nenhuma mentoria agendada." /> : (
              <ul className="-mx-5 divide-y">{upcoming.map((s) => <SessionRow key={s.id} s={s} viewer="student" />)}</ul>
            )}
          </SectionCard>
          <SectionCard title="Histórico">
            {!history.length ? <EmptyState text="Sem sessões anteriores." /> : <ul className="-mx-5 divide-y">{history.map((s) => <SessionRow key={s.id} s={s} viewer="student" />)}</ul>}
          </SectionCard>
        </div>
        <div className="space-y-6">
          <SectionCard title="Plano de ação"><ActionItemsPanel studentId={userId} canAdd={false} /></SectionCard>
          <SectionCard title="Metas"><GoalsPanel ownerId={userId} source="self" /></SectionCard>
        </div>
      </div>
      {requesting && <RequestMentoringDialog open onOpenChange={(o) => !o && setRequesting(null)} mentors={mentorOptions} defaultMentorId={requesting} />}
    </div>
  )
}

function MentorView({ userId }: { userId: string }) {
  const sessions = useSessions({ mentorId: userId })
  const mentees = useMentorMentees()
  const [scheduling, setScheduling] = useState(false)
  const [tab, setTab] = useState<string | null>(null)
  const list = sessions.data ?? []
  const requests = list.filter((s) => s.status === 'requested')
  const upcoming = list.filter((s) => s.status === 'scheduled').reverse()
  const past = list.filter((s) => s.status === 'completed' || s.status === 'canceled' || s.status === 'no_show')
  const menteeOptions = (mentees.data ?? []).map((m) => ({ id: m.student_id, name: m.full_name }))
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Mentorias</h1><p className="mt-1 text-muted-foreground">Solicitações, agenda e histórico das suas Neomentorias.</p></div>
        <Button onClick={() => setScheduling(true)} disabled={!menteeOptions.length}><Plus /> Agendar mentoria</Button>
      </header>
      <Tabs value={tab ?? (requests.length ? 'requests' : 'upcoming')} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="requests">Solicitações {requests.length > 0 && <Badge className="ml-1.5">{requests.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="upcoming">Agendadas</TabsTrigger>
          <TabsTrigger value="past">Histórico</TabsTrigger>
        </TabsList>
        {([['requests', requests, 'Nenhuma solicitação pendente.'], ['upcoming', upcoming, 'Nenhuma mentoria agendada.'], ['past', past, 'Sem histórico.']] as const).map(([k, l, e]) => (
          <TabsContent key={k} value={k}>
            {sessions.isPending ? <CardSkeleton /> : !l.length ? <EmptyState text={e} /> : <ul className="divide-y rounded-lg border bg-card">{l.map((s) => <SessionRow key={s.id} s={s} viewer="mentor" />)}</ul>}
          </TabsContent>
        ))}
      </Tabs>
      <ScheduleSessionDialog open={scheduling} onOpenChange={setScheduling} mentorId={userId} mentees={menteeOptions} />
    </div>
  )
}
