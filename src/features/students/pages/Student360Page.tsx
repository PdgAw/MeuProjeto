import { ArrowLeft, Briefcase, CheckCircle2, Clock, Mail, Phone, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { StartChatButton } from '@/components/shared/StartChatButton'
import { stageLabel, TRACK_LABEL } from '@/config/labels'
import { ATTENDANCE_LABEL, DIMENSION_LABEL, SUBMISSION_LABEL } from '@/features/academic/components/subject/shared'
import { useAchievements } from '@/features/achievements/api'
import { useAgreements } from '@/features/finance/api'
import { AgreementCard } from '@/features/finance/components/AgreementCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { NeoProgressCard } from '@/features/dashboard/neoleader/NeoProgressCard'
import { CATEGORY } from '@/features/experiences/components/labels'
import { useJourney } from '@/features/journey/api'
import { JourneyTimeline } from '@/features/journey/components/JourneyTimeline'
import { useSessions } from '@/features/mentoring/api'
import { ActionItemsPanel } from '@/features/mentoring/components/ActionItemsPanel'
import { GoalsPanel } from '@/features/mentoring/components/GoalsPanel'
import { PrivateNotesPanel } from '@/features/mentoring/components/PrivateNotesPanel'
import { SessionRow } from '@/features/mentoring/pages/SessionRow'
import { FamilyBusinessCard } from '@/features/ventures/components/FamilyBusinessCard'
import { fmtRelative } from '@/lib/format'
import { cn, initials } from '@/lib/utils'
import { useAcademic, useActivity, useSetEnrollmentStatus, useStudent, useStudentDocuments, useStudentExperiences } from '../api'

const TABS = [['resumo', 'Resumo'], ['jornada', 'Jornada'], ['academico', 'Acadêmico'], ['mentorias', 'Mentorias'], ['negocio', 'Negócio'], ['metas', 'Metas'],
  ['experiencias', 'Experiências'], ['frequencia', 'Frequência'], ['documentos', 'Documentos'], ['historico', 'Histórico']] as const

/** Visão 360º: everything about one Neoleader, for coordination/direction/authorized staff. */
export default function Student360Page() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { hasPermission } = useAuth()
  const { data: s, isPending } = useStudent(id)
  const setStatus = useSetEnrollmentStatus(id ?? '')
  if (isPending) return <CardSkeleton lines={5} />
  if (!s || !id) return <p className="text-muted-foreground">Neoleader não encontrado ou sem acesso.</p>
  const enr = s.enrollments[0]
  const tab = params.get('aba') ?? 'resumo'
  return (
    <div className="space-y-6">
      <Link to="/gestao/neoleaders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Neoleaders</Link>
      <Card><CardContent className="flex flex-col gap-5 pt-6 lg:flex-row lg:items-center">
        <Avatar className="h-20 w-20">{s.profile.avatar_url && <AvatarImage src={s.profile.avatar_url} alt="" />}<AvatarFallback className="text-xl">{initials(s.profile.full_name)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-semibold">{s.profile.full_name}</h1>
          <div className="flex flex-wrap gap-1.5">
            {enr?.cohort && <Badge>{enr.cohort.name}</Badge>}
            {s.neo && <Badge variant="accent">{s.neo.track === 'other' ? s.neo.track_other_label : TRACK_LABEL[s.neo.track]}</Badge>}
            {s.mentors.map((m) => <Badge key={m.id} variant="secondary">Neomentor: {m.mentor?.full_name}</Badge>)}
            {s.venture && <Badge variant="outline"><Briefcase className="h-3 w-3" />{s.venture.name} · {stageLabel(s.venture.stage)}</Badge>}
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {s.contact?.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{s.contact.email}</span>}
            {s.contact?.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{s.contact.phone}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Último acesso {s.profile.last_seen_at ? fmtRelative(s.profile.last_seen_at) : 'nunca'}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          {enr && (hasPermission('students.edit') ? (
            <Select aria-label="Status da matrícula" value={enr.status} onChange={(e) => setStatus.mutate({ enrollmentId: enr.id, status: e.target.value as typeof enr.status }, { onSuccess: () => toast.success('Status atualizado.'), onError: (er) => toast.error(er.message) })}>
              <option value="active">Ativo</option><option value="paused">Trancado</option><option value="completed">Concluído</option><option value="dropped">Evadido</option><option value="transferred">Transferido</option>
            </Select>
          ) : <Badge>{enr.status}</Badge>)}
          <StartChatButton variant="outline" userId={id} />
        </div>
      </CardContent></Card>

      <Tabs value={tab} onValueChange={(t) => setParams({ aba: t }, { replace: true })}>
        <TabsList className="w-full justify-start">{TABS.map(([k, l]) => <TabsTrigger key={k} value={k}>{l}</TabsTrigger>)}</TabsList>
        <TabsContent value="resumo"><Summary id={id} /></TabsContent>
        <TabsContent value="jornada"><Journey id={id} /></TabsContent>
        <TabsContent value="academico"><Academic id={id} /></TabsContent>
        <TabsContent value="mentorias"><Mentoring id={id} canSeePrivate={hasPermission('mentoring.manage')} /></TabsContent>
        <TabsContent value="negocio"><Business s={s} id={id} /></TabsContent>
        <TabsContent value="metas"><GoalsPanel ownerId={id} source="coordination" editable={hasPermission('students.edit')} /></TabsContent>
        <TabsContent value="experiencias"><Experiences id={id} /></TabsContent>
        <TabsContent value="frequencia"><Attendance id={id} /></TabsContent>
        <TabsContent value="documentos"><Documents id={id} /></TabsContent>
        <TabsContent value="historico"><Timeline id={id} /></TabsContent>
      </Tabs>
    </div>
  )
}

function FinanceSection({ id }: { id: string }) {
  const { data } = useAgreements(id)
  return (
    <SectionCard title="Financeiro">
      {!data?.length ? <EmptyState text="Nenhum contrato financeiro." /> : <div className="space-y-2">{data.map((a) => <AgreementCard key={a.id} a={a} showStudent={false} />)}</div>}
    </SectionCard>
  )
}

function Summary({ id }: { id: string }) {
  const { hasPermission } = useAuth()
  const ach = useAchievements(id)
  const activity = useActivity(id)
  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr] [&>*]:min-w-0">
      <NeoProgressCard studentId={id} />
      <div className="space-y-6">
        <SectionCard title="Conquistas">
          <div className="flex flex-wrap gap-1.5">{(ach.data ?? []).filter((a) => a.unlocked).map((a) => <Badge key={a.key} variant="accent">{a.title}</Badge>)}
            {ach.data && !ach.data.some((a) => a.unlocked) && <span className="text-sm text-muted-foreground">Nenhuma ainda.</span>}</div>
        </SectionCard>
        <SectionCard title="Atividade recente" action={{ label: 'Histórico', to: `?aba=historico` }}>
          <TimelineList items={(activity.data ?? []).slice(0, 6)} />
        </SectionCard>
        <SectionCard title="Próximos passos de mentoria"><ActionItemsPanel studentId={id} canAdd={false} /></SectionCard>
        {hasPermission('finance.view') && <FinanceSection id={id} />}
      </div>
    </div>
  )
}

function Journey({ id }: { id: string }) {
  const { data, isPending } = useJourney(id)
  return isPending ? <CardSkeleton /> : data?.length ? <JourneyTimeline items={data} /> : <EmptyState text="Sem itens na jornada." />
}

function Academic({ id }: { id: string }) {
  const { data, isPending } = useAcademic(id)
  if (isPending) return <CardSkeleton />
  const subs = data?.submissions ?? []
  const bySubject = new Map<string, { total: number; ok: number }>()
  for (const a of data?.attendance ?? []) {
    const k = a.lesson.subject?.name ?? '—'; const v = bySubject.get(k) ?? { total: 0, ok: 0 }
    v.total++; if (a.status === 'present' || a.status === 'late') v.ok++; bySubject.set(k, v)
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <SectionCard title="Frequência por disciplina">
        {!bySubject.size ? <EmptyState text="Sem registros de presença." /> : (
          <ul className="space-y-2 text-sm">{[...bySubject.entries()].map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className={cn('tabular-nums', 100 * v.ok / v.total < 75 && 'font-semibold text-destructive')}>{Math.round(100 * v.ok / v.total)}% <span className="text-xs text-muted-foreground">({v.ok}/{v.total})</span></span></li>)}</ul>
        )}
      </SectionCard>
      <SectionCard title="Entregas">
        {!subs.length ? <EmptyState text="Nenhuma entrega." /> : (
          <ul className="space-y-2 text-sm">{subs.map((x) => <li key={x.id} className="flex items-center justify-between gap-2"><Link to={`/entregas/${x.assignment?.id}`} className="truncate hover:underline">{x.assignment?.title} <span className="text-xs text-muted-foreground">· {x.assignment?.subject?.name}</span></Link>
            <Badge variant={x.status === 'reviewed' ? 'success' : 'secondary'}>{SUBMISSION_LABEL[x.status]}{x.score !== null ? ` · ${x.score}` : ''}</Badge></li>)}</ul>
        )}
      </SectionCard>
    </div>
  )
}

function Mentoring({ id, canSeePrivate }: { id: string; canSeePrivate: boolean }) {
  const { data, isPending } = useSessions({ studentId: id })
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] [&>*]:min-w-0">
      <SectionCard title="Sessões">{isPending ? <CardSkeleton /> : !data?.length ? <EmptyState text="Nenhuma mentoria." /> : <ul className="-mx-5 divide-y">{data.map((x) => <SessionRow key={x.id} s={x} viewer="staff" />)}</ul>}</SectionCard>
      {canSeePrivate ? <SectionCard title="Notas privadas dos Neomentores"><PrivateNotesPanel studentId={id} /></SectionCard>
        : <p className="text-sm text-muted-foreground">Notas privadas dos Neomentores são visíveis apenas para quem gerencia a Neomentoria.</p>}
    </div>
  )
}

function Business({ s, id }: { s: NonNullable<ReturnType<typeof useStudent>['data']>; id: string }) {
  return (
    <div className="space-y-6">
      {s.venture ? (
        <SectionCard title="Negócio" action={{ label: 'Abrir negócio', to: `/negocios/${s.venture.id}` }}>
          <p className="font-display text-lg font-semibold">{s.venture.name}</p>
          {s.venture.tagline && <p className="text-sm text-muted-foreground">{s.venture.tagline}</p>}
          <p className="mt-2 text-sm">Estágio: <strong>{stageLabel(s.venture.stage)}</strong> · atualizado {fmtRelative(s.venture.last_update_at)}</p>
        </SectionCard>
      ) : <EmptyState text="Sem negócio cadastrado." />}
      {s.neo?.track === 'successor' && <FamilyBusinessCard ownerId={id} editable={false} />}
    </div>
  )
}

function Experiences({ id }: { id: string }) {
  const { data, isPending } = useStudentExperiences(id)
  if (isPending) return <CardSkeleton />
  if (!data?.length) return <EmptyState text="Nenhuma experiência." />
  return (
    <ul className="space-y-3">{data.map((r) => (
      <li key={r.experience?.id} className="rounded-lg border bg-card p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><Link to={`/experiencias/${r.experience?.id}`} className="font-medium hover:underline">{r.experience?.title}</Link>
          <span className="flex gap-1.5">{r.experience && <Badge variant="outline">{CATEGORY[r.experience.category]}</Badge>}<Badge variant={r.status === 'attended' ? 'success' : 'secondary'}>{r.status === 'attended' ? 'Participou' : r.status === 'waitlist' ? 'Lista de espera' : r.status === 'confirmed' ? 'Confirmado' : r.status}</Badge></span></div>
        {r.reflection?.main_learning && <p className="mt-2"><span className="text-muted-foreground">Aprendizado:</span> {r.reflection.main_learning}</p>}
        {r.reflection?.application && <p><span className="text-muted-foreground">Vai aplicar:</span> {r.reflection.application}</p>}
      </li>
    ))}</ul>
  )
}

function Attendance({ id }: { id: string }) {
  const { data, isPending } = useAcademic(id)
  if (isPending) return <CardSkeleton />
  const rows = data?.attendance ?? []
  if (!rows.length) return <EmptyState text="Sem registros." />
  const ok = rows.filter((r) => r.status === 'present' || r.status === 'late').length
  return (
    <div className="space-y-3">
      <p className="text-sm">Frequência registrada: <strong>{Math.round((100 * ok) / rows.length)}%</strong> ({ok} de {rows.length} registros)</p>
      <ul className="divide-y rounded-lg border bg-card text-sm">{rows.map((r) => (
        <li key={r.lesson.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <Link to={`/aulas/${r.lesson.id}`} className="min-w-0 hover:underline"><span className="block truncate">{r.lesson.subject?.name} · {r.lesson.title}</span><span className="text-xs text-muted-foreground">{format(new Date(r.lesson.starts_at), "dd/MM/yyyy")}{r.method !== 'manual' ? ' · check-in pelo app' : ''}</span></Link>
          <span className={cn('flex shrink-0 items-center gap-1 text-xs font-medium', r.status === 'present' || r.status === 'late' ? 'text-success' : 'text-destructive')}>
            {r.status === 'present' || r.status === 'late' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{ATTENDANCE_LABEL[r.status]}</span>
        </li>
      ))}</ul>
    </div>
  )
}

function Documents({ id }: { id: string }) {
  const { data, isPending } = useStudentDocuments(id)
  if (isPending) return <CardSkeleton />
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <SectionCard title="Documentos pessoais">
        {!data?.own.length ? <EmptyState text="Nenhum documento pessoal." /> : <ul className="space-y-2 text-sm">{data.own.map((d) => <li key={d.id} className="flex justify-between gap-2"><span>{d.title}</span><Badge variant={d.status === 'signature_pending' ? 'destructive' : 'secondary'}>{d.status === 'signature_pending' ? 'Assinatura pendente' : d.status === 'required_reading' ? 'Leitura obrigatória' : 'Disponível'}</Badge></li>)}</ul>}
      </SectionCard>
      <SectionCard title="Leituras e assinaturas registradas">
        {!data?.acks.length ? <EmptyState text="Nenhuma confirmação registrada." /> : <ul className="space-y-2 text-sm">{data.acks.map((a, i) => <li key={i} className="flex justify-between gap-2"><span>{a.document?.title}</span><span className="text-xs text-muted-foreground">{a.signed_at ? `Assinado ${format(new Date(a.signed_at), 'dd/MM')}` : a.read_at ? `Lido ${format(new Date(a.read_at), 'dd/MM')}` : ''}</span></li>)}</ul>}
      </SectionCard>
    </div>
  )
}

function Timeline({ id }: { id: string }) {
  const { data, isPending } = useActivity(id)
  return isPending ? <CardSkeleton /> : <TimelineList items={data ?? []} />
}

function TimelineList({ items }: { items: { id: string; title: string; occurred_at: string; dimension: keyof typeof DIMENSION_LABEL | null }[] }) {
  if (!items.length) return <EmptyState text="Sem atividades registradas." />
  return (
    <ol className="relative space-y-3 border-l-2 border-border pl-5">
      {items.map((a) => (
        <li key={a.id} className="relative text-sm">
          <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="font-medium"><span className="mr-2 tabular-nums text-muted-foreground">{format(new Date(a.occurred_at), 'dd/MM', { locale: ptBR })}</span>{a.title}</p>
          {a.dimension && <p className="text-xs text-muted-foreground">{DIMENSION_LABEL[a.dimension]}</p>}
        </li>
      ))}
    </ol>
  )
}
