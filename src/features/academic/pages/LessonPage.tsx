import { ArrowLeft, CheckCircle2, Clock, DoorOpen, Lock, MapPin, Pencil, User, Video } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { LESSON_TYPE_LABEL } from '@/config/labels'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtTime } from '@/lib/format'
import { useLesson, useMyAttendance, useSelfCheckIn, useSubject, useUpdateLesson } from '../api'
import { AttendanceRoster } from '../components/AttendanceRoster'
import { LessonFormDialog } from '../components/LessonFormDialog'
import { MaterialsTab } from '../components/subject/MaterialsTab'
import { ATTENDANCE_LABEL, MODALITY_LABEL } from '../components/subject/shared'

const PROVIDER = { meet: 'Google Meet', zoom: 'Zoom', teams: 'Microsoft Teams', other: 'Link da aula' }

export default function LessonPage() {
  const { id } = useParams()
  const { user, hasPermission } = useAuth()
  const { data: l, isPending } = useLesson(id)
  const subject = useSubject(l?.subject_id)
  const mine = useMyAttendance(id, user?.user_id)
  const checkIn = useSelfCheckIn()
  const update = useUpdateLesson(id ?? '')
  const [editing, setEditing] = useState(false)
  if (!user) return null
  if (isPending) return <CardSkeleton lines={4} />
  if (!l) return <p className="text-muted-foreground">Aula não encontrada ou sem acesso.</p>

  const canTeach = hasPermission('subjects.manage') || hasPermission('attendance.manage') || l.teacher_id === user.user_id ||
    Boolean(subject.data?.subject_teachers.some((t) => t.teacher?.id === user.user_id))
  const started = isPast(new Date(l.starts_at))
  const attended = mine.data && (mine.data.status === 'present' || mine.data.status === 'late')
  const cohorts = subject.data?.subject_cohorts.map((c) => c.cohort).filter((c): c is { id: string; name: string } => Boolean(c)) ?? []

  return (
    <div className="space-y-6">
      <Link to={`/disciplinas/${l.subject_id}?aba=aulas`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />{l.subject?.name}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{LESSON_TYPE_LABEL[l.lesson_type]}</Badge>
            <Badge variant="outline">{MODALITY_LABEL[l.modality]}</Badge>
            {l.status === 'canceled' && <Badge variant="destructive">Cancelada</Badge>}
          </div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{l.title}</h1>
          <p className="mt-1 first-letter:uppercase text-muted-foreground">{format(new Date(l.starts_at), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
        </div>
        {canTeach && <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Editar aula</Button>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card><CardContent className="grid gap-4 pt-5 text-sm sm:grid-cols-2">
            <Info icon={<Clock className="h-4 w-4" />} label="Horário" value={`${fmtTime(l.starts_at)} – ${fmtTime(l.ends_at)}`} />
            <Info icon={<User className="h-4 w-4" />} label="Professor" value={l.teacher?.full_name ?? '—'} />
            {l.modality !== 'online' && <Info icon={<MapPin className="h-4 w-4" />} label="Local" value={[l.room, l.location].filter(Boolean).join(' · ') || '—'} />}
            {l.guest_name && <Info icon={<User className="h-4 w-4" />} label="Convidado" value={[l.guest_name, l.guest_title].filter(Boolean).join(' · ')} />}
            <Info icon={<User className="h-4 w-4" />} label="Turma" value={l.cohort?.name ?? '—'} />
            {l.description && <p className="whitespace-pre-line sm:col-span-2">{l.description}</p>}
            {l.meeting_url && (
              <Button asChild className="sm:col-span-2 sm:w-fit">
                <a href={l.meeting_url} target="_blank" rel="noreferrer"><Video /> Entrar pelo {PROVIDER[l.online_provider ?? 'other']}</a>
              </Button>
            )}
          </CardContent></Card>

          <SectionCard title="Materiais da aula">
            <MaterialsTab subjectId={l.subject_id} lessonId={l.id} canTeach={canTeach} lessons={[{ id: l.id, title: l.title }]} />
          </SectionCard>

          {canTeach && (
            <SectionCard title="Frequência">
              <AttendanceRoster lessonId={l.id} cohortId={l.cohort_id} />
            </SectionCard>
          )}
        </div>

        <aside className="space-y-4">
          {canTeach ? (
            <Card><CardContent className="space-y-3 pt-5">
              <p className="font-semibold">Check-in dos Neoleaders</p>
              <p className="text-sm text-muted-foreground">
                {l.checkin_open ? 'Aberto: os Neoleaders podem confirmar presença pelo app. Quem chegar 15 min após o início fica como "Atrasado".' : 'Fechado. Abra no início da aula para os Neoleaders registrarem presença.'}
              </p>
              <Button variant={l.checkin_open ? 'outline' : 'accent'} className="w-full" disabled={update.isPending}
                onClick={() => update.mutate({ checkin_open: !l.checkin_open }, { onSuccess: () => toast.success(l.checkin_open ? 'Check-in fechado.' : 'Check-in aberto.') })}>
                {l.checkin_open ? <><Lock /> Fechar check-in</> : <><DoorOpen /> Abrir check-in</>}
              </Button>
              <p className="text-xs text-muted-foreground">Check-in por QR Code será adicionado em uma próxima versão.</p>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="space-y-3 pt-5">
              <p className="font-semibold">Minha presença</p>
              {attended ? (
                <p className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" />{ATTENDANCE_LABEL[mine.data!.status]}</p>
              ) : mine.data ? (
                <p className="text-sm">{ATTENDANCE_LABEL[mine.data.status]}</p>
              ) : l.checkin_open ? (
                <Button variant="accent" className="w-full" disabled={checkIn.isPending}
                  onClick={() => checkIn.mutate(l.id, { onSuccess: () => { toast.success('Presença confirmada!'); void mine.refetch() }, onError: (e) => toast.error(e.message) })}>
                  Fazer check-in
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">{started ? 'Sem registro de presença ainda.' : 'O check-in abre no início da aula.'}</p>
              )}
            </CardContent></Card>
          )}
        </aside>
      </div>
      {editing && <LessonFormDialog open onOpenChange={setEditing} subjectId={l.subject_id} cohorts={cohorts} lesson={l} />}
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3"><span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div></div>
  )
}
