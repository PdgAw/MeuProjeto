import { AlertTriangle, ArrowLeft, BookOpen, Briefcase, ClipboardX, Pencil, TrendingUp, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { stageLabel, TRACK_LABEL } from '@/config/labels'
import { usePermission } from '@/features/auth/hooks/useAuth'
import { fmtRelative } from '@/lib/format'
import { cn, initials } from '@/lib/utils'
import { RISK_LABEL, RISK_SHORT, useCohort, useCohortStudents } from '../api'
import { CohortFormDialog } from '../components/CohortFormDialog'

export default function CohortDetailPage() {
  const { id } = useParams()
  const cohort = useCohort(id)
  const students = useCohortStudents(id)
  const canEdit = usePermission('classes.edit')
  const [editing, setEditing] = useState(false)
  const [flag, setFlag] = useState<string | null>(null)
  if (cohort.isPending) return <CardSkeleton lines={4} />
  if (!cohort.data) return <p className="text-muted-foreground">Turma não encontrada.</p>
  const c = cohort.data
  const list = students.data ?? []
  const rates = list.map((s) => s.attendance_rate).filter((r): r is number => r !== null).map(Number)
  const avgAttendance = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null
  const engaged = list.filter((s) => s.last_activity_at && Date.now() - new Date(s.last_activity_at).getTime() < 14 * 864e5).length
  const overdue = list.reduce((n, s) => n + s.overdue_assignments, 0)
  const ventures = list.filter((s) => s.venture_id).length
  const mentored = list.filter((s) => s.mentor_name).length
  const atRisk = list.filter((s) => s.risk_flags.length > 0).length
  const alerts = Object.keys(RISK_LABEL).map((k) => ({ key: k, students: list.filter((s) => s.risk_flags.includes(k)) })).filter((a) => a.students.length)
  const shown = flag ? list.filter((s) => s.risk_flags.includes(flag)) : list

  return (
    <div className="space-y-6">
      <Link to="/gestao/turmas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Turmas</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">{c.name}</h1>
          <p className="mt-1 text-muted-foreground">{c.coordinator ? `Coordenação: ${c.coordinator.full_name}` : 'Sem coordenador definido'}</p></div>
        {canEdit && <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Editar turma</Button>}
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<Users className="h-4 w-4" />} label="Neoleaders" value={list.length} />
        <Kpi icon={<UserCheck className="h-4 w-4" />} label="Frequência média" value={avgAttendance === null ? '—' : `${avgAttendance}%`} warn={avgAttendance !== null && avgAttendance < 75} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Engajados (14d)" value={`${engaged}/${list.length}`} />
        <Kpi icon={<Briefcase className="h-4 w-4" />} label="Projetos ativos" value={ventures} />
        <Kpi icon={<ClipboardX className="h-4 w-4" />} label="Entregas atrasadas" value={overdue} warn={overdue > 0} />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Em risco" value={atRisk} warn={atRisk > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] [&>*]:min-w-0">
        <SectionCard title={flag ? `Neoleaders · ${RISK_SHORT[flag]}` : 'Neoleaders'} icon={<Users className="h-4 w-4 text-primary" />}>
          {flag && <button className="mb-3 text-xs font-medium text-primary hover:underline" onClick={() => setFlag(null)}>Mostrar todos</button>}
          {students.isPending ? <CardSkeleton /> : !shown.length ? <EmptyState text="Nenhum Neoleader matriculado." /> : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="border-y bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-5 py-2.5">Neoleader</th><th className="px-3 py-2.5 text-right">Freq.</th><th className="px-3 py-2.5">Negócio</th><th className="px-3 py-2.5">Neomentor</th><th className="px-3 py-2.5">Atividade</th><th className="px-5 py-2.5">Alertas</th></tr>
                </thead>
                <tbody className="divide-y">
                  {shown.map((s) => (
                    <tr key={s.user_id} className="hover:bg-secondary/30">
                      <td className="px-5 py-3">
                        <Link to={`/gestao/neoleaders/${s.user_id}`} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">{s.avatar_url && <AvatarImage src={s.avatar_url} alt="" />}<AvatarFallback className="text-xs">{initials(s.full_name)}</AvatarFallback></Avatar>
                          <div><p className="font-medium hover:underline">{s.full_name}</p><p className="text-xs text-muted-foreground">{s.track ? TRACK_LABEL[s.track] : '—'}</p></div>
                        </Link>
                      </td>
                      <td className={cn('px-3 py-3 text-right tabular-nums', s.risk_flags.includes('low_attendance') && 'font-semibold text-destructive')}>
                        {s.attendance_rate === null ? '—' : `${Math.round(Number(s.attendance_rate))}%`}</td>
                      <td className="px-3 py-3">{s.venture_name ? <><p className="truncate">{s.venture_name}</p><p className="text-xs text-muted-foreground">{s.venture_stage && stageLabel(s.venture_stage)}</p></> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-3">{s.mentor_name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{s.last_activity_at ? fmtRelative(s.last_activity_at) : 'nunca'}</td>
                      <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{s.risk_flags.map((f) => <Badge key={f} variant="warning">{RISK_SHORT[f]}</Badge>)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Alertas" icon={<AlertTriangle className="h-4 w-4 text-warning" />}>
            {!alerts.length ? <EmptyState text="Nenhum alerta. Turma saudável." /> : (
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li key={a.key}>
                    <button onClick={() => setFlag(flag === a.key ? null : a.key)}
                      className={cn('w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-secondary/50', flag === a.key && 'border-warning bg-warning/10')}>
                      <p className="font-medium"><span className="tabular-nums">{a.students.length}</span> {a.students.length === 1 ? RISK_LABEL[a.key].one : RISK_LABEL[a.key].many}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.students.map((s) => s.full_name.split(' ')[0]).join(', ')}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Disciplinas" icon={<BookOpen className="h-4 w-4 text-primary" />}>
            <ul className="space-y-2 text-sm">
              {c.subject_cohorts.map((sc) => sc.subject && (
                <li key={sc.subject.id}><Link to={`/disciplinas/${sc.subject.id}`} className="flex justify-between hover:underline"><span>{sc.subject.name}</span><span className="font-mono text-xs text-muted-foreground">{sc.subject.code}</span></Link></li>
              ))}
              {!c.subject_cohorts.length && <li className="text-muted-foreground">Nenhuma disciplina vinculada.</li>}
            </ul>
          </SectionCard>
          <Card><CardContent className="pt-5 text-sm"><p className="text-muted-foreground">Neomentoria</p><p className="font-medium">{mentored} de {list.length} Neoleaders com Neomentor</p></CardContent></Card>
        </div>
      </div>
      <CohortFormDialog open={editing} onOpenChange={setEditing} cohort={c} />
    </div>
  )
}

function Kpi({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</p>
      <p className={cn('mt-1.5 font-display text-2xl font-semibold tabular-nums', warn && 'text-warning')}>{value}</p>
    </div>
  )
}
