import { CalendarRange, Clock, GraduationCap, Target, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { fmtDate, parseLocalDate } from '@/lib/format'
import { initials } from '@/lib/utils'
import { subjectProgress, type SubjectDetail } from '../../api'
import { DIMENSION_LABEL } from './shared'

export function OverviewTab({ subject: s, cohortId }: { subject: SubjectDetail; cohortId?: string | null }) {
  const p = subjectProgress(s, cohortId)
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <Card><CardContent className="space-y-4 pt-5">
          <p className="whitespace-pre-line leading-relaxed">{s.description || 'Sem descrição.'}</p>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary" />Competências desenvolvidas</p>
            <div className="flex flex-wrap gap-2">
              {s.subject_competencies.length ? s.subject_competencies.map((c) => <Badge key={c.competency?.id} variant="secondary">{c.competency?.name}</Badge>)
                : <span className="text-sm text-muted-foreground">Não definidas.</span>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Contribui para o Neo Progress</p>
            <div className="flex flex-wrap gap-2">{s.dimensions.map((d) => <Badge key={d}>{DIMENSION_LABEL[d]}</Badge>)}</div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-primary" />Professores</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.subject_teachers.map((t) => t.teacher && (
              <li key={t.teacher.id}>
                <Link to={`/professores/${t.teacher.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-secondary/50">
                  <Avatar className="h-10 w-10">{t.teacher.avatar_url && <AvatarImage src={t.teacher.avatar_url} alt="" />}<AvatarFallback>{initials(t.teacher.full_name)}</AvatarFallback></Avatar>
                  <div><p className="text-sm font-medium">{t.teacher.full_name}</p><p className="text-xs text-muted-foreground">{t.role === 'lead' ? 'Responsável' : 'Convidado'}</p></div>
                </Link>
              </li>
            ))}
            {!s.subject_teachers.length && <li className="text-sm text-muted-foreground">Professor a definir.</li>}
          </ul>
        </CardContent></Card>
      </div>
      <Card className="h-fit"><CardContent className="space-y-4 pt-5 text-sm">
        <div>
          <div className="mb-1.5 flex justify-between"><span className="font-medium">Progresso</span><span className="tabular-nums text-muted-foreground">{p.done}/{p.total} aulas</span></div>
          <Progress value={p.percent} />
        </div>
        <Info icon={<Clock className="h-4 w-4" />} label="Carga horária" value={s.workload_hours ? `${Number(s.workload_hours)} horas` : '—'} />
        <Info icon={<CalendarRange className="h-4 w-4" />} label="Período"
          value={[s.period_label, s.starts_on && s.ends_on ? `${fmtDate(parseLocalDate(s.starts_on))} – ${fmtDate(parseLocalDate(s.ends_on))}` : null].filter(Boolean).join(' · ') || '—'} />
        <Info icon={<Users className="h-4 w-4" />} label="Turmas" value={s.subject_cohorts.map((c) => c.cohort?.name).join(', ') || '—'} />
      </CardContent></Card>
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>
    </div>
  )
}
