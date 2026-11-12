import { addDays, startOfWeek } from 'date-fns'
import { BookOpenCheck, Briefcase, CalendarDays, ClipboardX, GraduationCap, Mountain, Sparkles, UserCheck, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Select } from '@/components/ui/select'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { useCohorts, useLessonsInRange } from '@/features/academic/api'
import { LessonList } from '@/features/academic/components/LessonList'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { firstName, greeting } from '@/lib/utils'
import { useAllStudents, useOverview } from '../api'
import { AlertsCard } from '../components/AlertsCard'
import { Kpi } from '../components/Kpi'

export default function CoordinationDashboardPage() {
  const { user } = useAuth()
  const [cohort, setCohort] = useState('')
  const overview = useOverview(cohort || undefined)
  const students = useAllStudents()
  const cohorts = useCohorts()
  const week = useMemo(() => { const from = startOfWeek(new Date(), { weekStartsOn: 1 }); return { from, to: addDays(from, 7) } }, [])
  const lessons = useLessonsInRange(week)
  if (!user) return null
  const o = overview.data
  const list = (students.data ?? []).filter((s) => !cohort || s.cohort_id === cohort)
  const atRisk = list.filter((s) => s.risk_flags.length > 0).length
  const weekLessons = (lessons.data ?? []).filter((l) => !cohort || l.cohort_id === cohort)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">{greeting()}, {firstName(user.preferred_name || user.full_name)}.</h1><p className="mt-1 text-muted-foreground">Visão geral da evolução dos Neoleaders.</p></div>
        <Select className="w-56" value={cohort} onChange={(e) => setCohort(e.target.value)} aria-label="Turma"><option value="">Todas as turmas</option>{cohorts.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      </header>
      {overview.isPending ? <CardSkeleton lines={2} /> : o && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Kpi icon={<GraduationCap className="h-4 w-4" />} label="Neoleaders ativos" value={o.neoleaders_active} to="/gestao/neoleaders" />
          <Kpi icon={<Users className="h-4 w-4" />} label="Turmas" value={o.cohorts_active} to="/gestao/turmas" />
          <Kpi icon={<BookOpenCheck className="h-4 w-4" />} label="Aulas na semana" value={o.lessons_week} to="/gestao/aulas" />
          <Kpi icon={<Sparkles className="h-4 w-4" />} label="Mentorias na semana" value={o.mentorings_week} to="/gestao/mentorias" />
          <Kpi icon={<Mountain className="h-4 w-4" />} label="Eventos (30 dias)" value={o.events_upcoming} to="/gestao/experiencias" />
          <Kpi icon={<UserCheck className="h-4 w-4" />} label="Frequência média" value={o.attendance_rate === null ? '—' : `${Math.round(o.attendance_rate)}%`} hint="últimos 60 dias" tone={o.attendance_rate !== null && o.attendance_rate < 75 ? 'warn' : undefined} />
          <Kpi icon={<ClipboardX className="h-4 w-4" />} label="Entregas atrasadas" value={o.overdue_deliveries} tone={o.overdue_deliveries ? 'warn' : undefined} />
          <Kpi icon={<Briefcase className="h-4 w-4" />} label="Projetos ativos" value={o.ventures_active} hint={`${atRisk} alunos em risco`} to="/gestao/projetos" />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <SectionCard title="Neoleaders que pedem atenção" icon={<GraduationCap className="h-4 w-4 text-primary" />} action={{ label: 'Todos', to: '/gestao/neoleaders' }}>
            {students.isPending ? <CardSkeleton /> : !list.filter((s) => s.risk_flags.length).length ? <EmptyState text="Nenhum Neoleader em risco." /> : (
              <ul className="divide-y">
                {list.filter((s) => s.risk_flags.length).sort((a, b) => b.risk_flags.length - a.risk_flags.length).slice(0, 8).map((s) => (
                  <li key={s.user_id}><Link to={`/gestao/neoleaders/${s.user_id}`} className="flex items-center justify-between gap-3 py-2.5 hover:underline">
                    <span className="min-w-0"><span className="block truncate font-medium">{s.full_name}</span><span className="text-xs text-muted-foreground">{s.cohort_name}</span></span>
                    <span className="shrink-0 text-xs text-warning">{s.risk_flags.length} alerta{s.risk_flags.length > 1 ? 's' : ''}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Aulas da semana" icon={<CalendarDays className="h-4 w-4 text-primary" />} action={{ label: 'Aulas', to: '/gestao/aulas' }}>
            {lessons.isPending ? <CardSkeleton /> : <LessonList lessons={weekLessons} empty="Nenhuma aula nesta semana." />}
          </SectionCard>
        </div>
        <AlertsCard students={list} overview={o} loading={students.isPending || overview.isPending} />
      </div>
    </div>
  )
}
