import { addDays, startOfDay } from 'date-fns'
import { BookOpen, CalendarCheck2, ClipboardCheck, Presentation } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { usePendingReviews, useSubjects, useTeacherLessons } from '@/features/academic/api'
import { LessonList } from '@/features/academic/components/LessonList'
import { SubjectCard } from '@/features/academic/components/SubjectCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AnnouncementsCard } from '@/features/dashboard/neoleader/AnnouncementsCard'
import { fmtWhen } from '@/lib/format'
import { firstName, greeting } from '@/lib/utils'

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const range = useMemo(() => { const from = startOfDay(new Date()); return { from, to: addDays(from, 14) } }, [])
  const lessons = useTeacherLessons(user?.user_id, range)
  const subjects = useSubjects()
  const reviews = usePendingReviews(true)
  if (!user) return null
  const mySubjects = (subjects.data ?? []).filter((s) => s.subject_teachers.some((t) => t.teacher?.id === user.user_id))
  const today = (lessons.data ?? []).filter((l) => new Date(l.starts_at).toDateString() === new Date().toDateString())
  const upcoming = (lessons.data ?? []).filter((l) => !today.includes(l)).slice(0, 6)
  const cohorts = new Set(mySubjects.flatMap((s) => s.subject_cohorts.map((c) => c.cohort?.name)).filter(Boolean))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{greeting()}, {firstName(user.preferred_name || user.full_name)}.</h1>
        <p className="mt-1 text-muted-foreground">Suas aulas, turmas e entregas para avaliar.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<CalendarCheck2 className="h-4 w-4" />} label="Aulas hoje" value={today.length} />
        <Stat icon={<Presentation className="h-4 w-4" />} label="Próximas 2 semanas" value={lessons.data?.length ?? 0} />
        <Stat icon={<BookOpen className="h-4 w-4" />} label="Disciplinas" value={mySubjects.length} sub={[...cohorts].join(', ')} />
        <Stat icon={<ClipboardCheck className="h-4 w-4" />} label="Para avaliar" value={reviews.data?.length ?? 0} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Aulas de hoje" icon={<CalendarCheck2 className="h-4 w-4 text-primary" />} action={{ label: 'Minhas aulas', to: '/aulas' }}>
            {lessons.isPending ? <CardSkeleton lines={2} /> : <LessonList lessons={today} empty="Nenhuma aula hoje." />}
          </SectionCard>
          <SectionCard title="Próximas aulas" icon={<Presentation className="h-4 w-4 text-primary" />}>
            {lessons.isPending ? <CardSkeleton /> : <LessonList lessons={upcoming} />}
          </SectionCard>
        </div>
        <div className="space-y-6">
          <SectionCard title="Entregas para avaliar" icon={<ClipboardCheck className="h-4 w-4 text-primary" />}>
            {reviews.isPending ? <CardSkeleton /> : !reviews.data?.length ? <EmptyState text="Nada pendente. Tudo avaliado!" /> : (
              <ul className="space-y-3">
                {reviews.data.map((r) => (
                  <li key={r.id}>
                    <Link to={`/entregas/${r.assignment.id}`} className="block rounded-md p-2 hover:bg-secondary/50">
                      <p className="text-sm font-medium">{r.student?.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.assignment.title} · {r.assignment.subject?.name}</p>
                      <div className="mt-1 flex gap-2">{r.status === 'late' && <Badge variant="warning">Atrasada</Badge>}<span className="text-[11px] text-muted-foreground">{r.submitted_at && fmtWhen(r.submitted_at)}</span></div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <AnnouncementsCard userId={user.user_id} />
        </div>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Minhas disciplinas</h2>
        {subjects.isPending ? <CardSkeleton /> : !mySubjects.length ? <EmptyState text="Nenhuma disciplina vinculada a você ainda." /> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{mySubjects.map((s) => <SubjectCard key={s.id} subject={s} />)}</div>
        )}
      </section>
    </div>
  )
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{icon}{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
