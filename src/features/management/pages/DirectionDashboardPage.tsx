import { subDays } from 'date-fns'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Briefcase, GraduationCap, HeartHandshake, Mountain, Smile, Sparkles, TrendingUp, UserCheck, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Select } from '@/components/ui/select'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { TRACK_LABEL, VENTURE_STAGES } from '@/config/labels'
import { useCohorts } from '@/features/academic/api'
import { usePermission } from '@/features/auth/hooks/useAuth'
import { useAdmissionsFunnel, useExecutive } from '../api'
import { Kpi } from '../components/Kpi'

const PERIODS = [[30, 'Últimos 30 dias'], [90, 'Últimos 90 dias'], [180, 'Últimos 6 meses'], [365, 'Último ano']] as const
const FUNNEL = [['new_lead', 'Novo interessado'], ['application_received', 'Inscrição'], ['screening', 'Triagem'], ['interview', 'Entrevista'], ['committee', 'Comitê'], ['approved', 'Aprovado'], ['enrolled', 'Matriculado']] as const
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`)

function Tip({ active, payload, unit }: { active?: boolean; payload?: { payload: { label: string; value: number | null } }[]; unit?: string }) {
  const p = payload?.[0]?.payload
  if (!active || !p) return null
  return <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md"><p className="font-medium first-letter:uppercase">{p.label}</p><p className="text-muted-foreground">{p.value === null ? 'Sem dados' : `${p.value}${unit ?? ''}`}</p></div>
}

/** Executive view: few, actionable indicators. One series per chart, single hue, one axis. */
export default function DirectionDashboardPage() {
  const cohorts = useCohorts()
  const seesAdmissions = usePermission('admissions.view')
  const [days, setDays] = useState(180)
  const [cohort, setCohort] = useState('')
  const [track, setTrack] = useState<'' | 'founder' | 'successor' | 'other'>('')
  const [status, setStatus] = useState<'' | 'active' | 'paused' | 'completed' | 'dropped'>('active')
  const range = useMemo(() => ({ from: subDays(new Date(), days), to: new Date() }), [days])
  const { data: k, isPending } = useExecutive({ ...range, cohort, track, status })
  const funnel = useAdmissionsFunnel(seesAdmissions)
  const monthly = (k?.monthly ?? []).map((m) => ({ label: format(parseISO(`${m.month}-01`), 'MMM/yy', { locale: ptBR }), mentorings: m.mentorings, attendance: m.attendance }))
  const stageMax = Math.max(1, ...VENTURE_STAGES.map((s) => k?.ventures_by_stage[s.key] ?? 0))
  const funnelMax = Math.max(1, ...FUNNEL.map(([key]) => funnel.data?.[key] ?? 0))

  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Visão executiva</h1><p className="mt-1 text-muted-foreground">Os Neoleaders estão evoluindo como empreendedores e líderes?</p></header>
      <div className="flex flex-wrap gap-2" aria-label="Filtros">
        <Select className="w-44" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Período">{PERIODS.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</Select>
        <Select className="w-48" value={cohort} onChange={(e) => setCohort(e.target.value)} aria-label="Turma"><option value="">Todas as turmas</option>{cohorts.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select className="w-48" value={track} onChange={(e) => setTrack(e.target.value as typeof track)} aria-label="Perfil"><option value="">Todos os perfis</option>{Object.entries(TRACK_LABEL).map(([key, l]) => <option key={key} value={key}>{l}</option>)}</Select>
        <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status"><option value="">Todos os status</option><option value="active">Ativos</option><option value="paused">Trancados</option><option value="completed">Concluídos</option><option value="dropped">Evadidos</option></Select>
      </div>
      {isPending || !k ? <CardSkeleton lines={4} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <Kpi icon={<GraduationCap className="h-4 w-4" />} label="Neoleaders" value={k.neoleaders} to="/gestao/neoleaders" />
            <Kpi icon={<UserPlus className="h-4 w-4" />} label="Novas admissões" value={k.admissions_new} hint={`${k.admissions_enrolled} matriculados`} to={seesAdmissions ? '/gestao/admissoes' : undefined} />
            <Kpi icon={<HeartHandshake className="h-4 w-4" />} label="Retenção" value={pct(k.retention_rate)} tone={k.retention_rate !== null && k.retention_rate < 85 ? 'warn' : 'good'} />
            <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Engajamento" value={pct(k.engagement_rate)} hint="ativos nos últimos 14 dias" />
            <Kpi icon={<UserCheck className="h-4 w-4" />} label="Frequência" value={pct(k.attendance_rate)} tone={k.attendance_rate !== null && k.attendance_rate < 75 ? 'warn' : undefined} />
            <Kpi icon={<Sparkles className="h-4 w-4" />} label="Mentorias realizadas" value={k.mentorings_done} />
            <Kpi icon={<Briefcase className="h-4 w-4" />} label="Projetos ativos" value={k.ventures_active} to="/gestao/projetos" />
            <Kpi icon={<Mountain className="h-4 w-4" />} label="Experiências realizadas" value={k.experiences_held} />
            <Kpi icon={<Smile className="h-4 w-4" />} label="Satisfação" value={k.satisfaction === null ? '—' : `${k.satisfaction}/5`} hint={`${k.satisfaction_responses} avaliações de experiências`} />
            <Kpi icon={<Users className="h-4 w-4" />} label="Turmas ativas" value={k.cohorts_active} to="/gestao/turmas" />
            <Kpi label="Professores" value={k.teachers} to="/gestao/professores" />
            <Kpi label="Neomentores" value={k.mentors} to="/gestao/neomentores" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            <SectionCard title="Mentorias realizadas por mês">
              <div className="h-56" role="img" aria-label={`Mentorias por mês: ${monthly.map((m) => `${m.label} ${m.mentorings}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly.map((m) => ({ label: m.label, value: m.mentorings }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<Tip />} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <SectionCard title="Frequência por mês">
              <div className="h-56" role="img" aria-label={`Frequência por mês: ${monthly.map((m) => `${m.label} ${m.attendance ?? 'sem dados'}%`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly.map((m) => ({ label: m.label, value: m.attendance }))} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" padding={{ left: 12, right: 12 }} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ stroke: 'hsl(var(--border))' }} content={<Tip unit="%" />} />
                    <Line dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls dot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))', strokeWidth: 2 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <SectionCard title="Projetos por estágio">
              <ul className="space-y-2.5" aria-label="Projetos por estágio">
                {VENTURE_STAGES.map((s) => {
                  const n = k.ventures_by_stage[s.key] ?? 0
                  return <li key={s.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm"><span className="text-muted-foreground">{s.label}</span>
                    <span className="h-3 rounded-r-[4px] bg-secondary"><span className="block h-full rounded-r-[4px] bg-primary" style={{ width: `${(100 * n) / stageMax}%` }} /></span><span className="text-right tabular-nums">{n}</span></li>
                })}
              </ul>
            </SectionCard>
            {seesAdmissions && (
              <SectionCard title="Jornada de ingresso (pipeline atual)" action={{ label: 'Admissões', to: '/gestao/admissoes' }}>
                {funnel.isPending ? <CardSkeleton /> : (
                  <ul className="space-y-2.5" aria-label="Candidatos por etapa">
                    {FUNNEL.map(([key, l]) => {
                      const n = funnel.data?.[key] ?? 0
                      return <li key={key} className="grid grid-cols-[8rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm"><span className="text-muted-foreground">{l}</span>
                        <span className="h-3 rounded-r-[4px] bg-secondary"><span className="block h-full rounded-r-[4px] bg-primary" style={{ width: `${(100 * n) / funnelMax}%` }} /></span><span className="text-right tabular-nums">{n}</span></li>
                    })}
                  </ul>
                )}
              </SectionCard>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Satisfação: média das avaliações (1–5) das Experiências Neo no período. Uma pesquisa de NPS dedicada pode ser adicionada depois.</p>
        </>
      )}
    </div>
  )
}
