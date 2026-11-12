import { BarChart3, Briefcase, ClipboardList, Download, GraduationCap, Mountain, Sparkles } from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { stageLabel, TRACK_LABEL } from '@/config/labels'
import { admissionLabel } from '@/features/admissions/api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { RISK_SHORT } from '@/features/cohorts/api'
import { useCohortOptions } from '@/features/admissions/api'
import { useExecutive } from '@/features/management/api'
import { downloadCsv } from '@/lib/csv'
import { supabase } from '@/lib/supabase'
import { parseLocalDate } from '@/lib/format'

const pct = (v: number | null) => (v === null ? '' : `${Math.round(v)}%`)
const d = (s: string | null | undefined) => (s ? format(new Date(s), 'dd/MM/yyyy HH:mm') : '')

/** Exportable reports. Every export runs as the signed-in user, so RLS limits what each person can download. */
export default function ReportsPage() {
  const { hasPermission } = useAuth()
  const cohorts = useCohortOptions()
  const [from, setFrom] = useState(format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [cohort, setCohort] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const range = { from: parseLocalDate(from), to: new Date(parseLocalDate(to).getTime() + 86_399_000) }
  const exec = useExecutive({ ...range, cohort, track: '', status: 'active' })
  const cohortName = cohorts.data?.find((c) => c.id === cohort)?.name ?? 'todas'
  const suffix = `${from}_${to}${cohort ? `_${cohortName.replace(/\W+/g, '-')}` : ''}`

  const run = async (key: string, fn: () => Promise<Record<string, unknown>[]>, name: string) => {
    setBusy(key)
    try {
      const rows = await fn()
      if (!rows.length) toast.info('Nada a exportar para esses filtros.')
      else downloadCsv(rows, `${name}_${suffix}`)
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(null) }
  }
  const studentIds = async () => {
    if (!cohort) return null
    const { data } = await supabase.from('enrollments').select('user_id').eq('cohort_id', cohort)
    return (data ?? []).map((x) => x.user_id)
  }

  const reports: { key: string; icon: ReactNode; title: string; text: string; perm: boolean; fn: () => Promise<Record<string, unknown>[]> }[] = [
    {
      key: 'kpis', icon: <BarChart3 />, title: 'Indicadores executivos', text: 'Neoleaders, retenção, engajamento, frequência, mentorias, projetos, experiências e satisfação no período.', perm: hasPermission('reports.view'),
      fn: async () => {
        const k = exec.data
        if (!k) return []
        return [
          ['Neoleaders ativos', k.neoleaders], ['Novos candidatos', k.admissions_new], ['Matrículas via admissões', k.admissions_enrolled], ['Retenção', pct(k.retention_rate)],
          ['Engajamento', pct(k.engagement_rate)], ['Frequência média', pct(k.attendance_rate)], ['Mentorias realizadas', k.mentorings_done], ['Projetos ativos', k.ventures_active],
          ['Experiências realizadas', k.experiences_held], ['Satisfação (1–5)', k.satisfaction?.toFixed(1) ?? ''], ['Respostas de satisfação', k.satisfaction_responses],
          ['Turmas ativas', k.cohorts_active], ['Professores', k.teachers], ['Neomentores', k.mentors],
          ...Object.entries(k.ventures_by_stage).map(([s, n]) => [`Projetos em ${stageLabel(s as never)}`, n]),
          ...k.monthly.map((m) => [`Mentorias ${m.month}`, m.mentorings]), ...k.monthly.map((m) => [`Frequência ${m.month}`, pct(m.attendance)]),
        ].map(([Indicador, Valor]) => ({ Indicador, Valor, Período: `${from} a ${to}`, Turma: cohortName }))
      },
    },
    {
      key: 'students', icon: <GraduationCap />, title: 'Neoleaders e alertas', text: 'Frequência, entregas atrasadas, negócio, Neomentor e alertas de risco por Neoleader.', perm: hasPermission('students.view'),
      fn: async () => {
        const list = cohort ? [{ id: cohort, name: cohortName }] : (cohorts.data ?? []).filter((c) => c.status === 'active')
        const rows = await Promise.all(list.map(async (c) => {
          const { data, error } = await supabase.rpc('cohort_students', { p_cohort: c.id })
          if (error) throw error
          return data.map((s) => ({ Neoleader: s.full_name, Turma: c.name, Trilha: s.track ? TRACK_LABEL[s.track] : '', 'Frequência %': s.attendance_rate ?? '', 'Entregas atrasadas': s.overdue_assignments,
            Negócio: s.venture_name ?? '', Estágio: s.venture_stage ? stageLabel(s.venture_stage) : '', Neomentor: s.mentor_name ?? '', 'Última atividade': d(s.last_activity_at), Alertas: s.risk_flags.map((f) => RISK_SHORT[f]).join(', ') }))
        }))
        return rows.flat()
      },
    },
    {
      key: 'mentoring', icon: <Sparkles />, title: 'Mentorias', text: 'Sessões do período com Neomentor, Neoleader, status, temas e resumo compartilhado.', perm: hasPermission('mentoring.view'),
      fn: async () => {
        let q = supabase.from('mentoring_sessions').select('scheduled_at, status, duration_min, modality, topics, summary, completed_at, student:profiles!mentoring_sessions_student_id_fkey(full_name), mentor:profiles!mentoring_sessions_mentor_id_fkey(full_name)')
          .gte('scheduled_at', range.from.toISOString()).lte('scheduled_at', range.to.toISOString()).order('scheduled_at')
        const ids = await studentIds(); if (ids) q = q.in('student_id', ids)
        const { data, error } = await q
        if (error) throw error
        return data.map((s) => ({ Data: d(s.scheduled_at), Neoleader: s.student?.full_name, Neomentor: s.mentor?.full_name, Status: s.status, 'Duração (min)': s.duration_min, Modalidade: s.modality, Temas: s.topics.join(', '), Resumo: s.summary ?? '' }))
      },
    },
    {
      key: 'ventures', icon: <Briefcase />, title: 'Projetos e negócios', text: 'Negócio principal de cada Neoleader, estágio e última atualização.', perm: hasPermission('ventures.view'),
      fn: async () => {
        let q = supabase.from('ventures').select('name, segment, stage, last_update_at, is_primary, owner:profiles!ventures_owner_id_fkey(full_name)').order('name')
        const ids = await studentIds(); if (ids) q = q.in('owner_id', ids)
        const { data, error } = await q
        if (error) throw error
        return data.map((v) => ({ Negócio: v.name, Neoleader: v.owner?.full_name, Segmento: v.segment ?? '', Estágio: stageLabel(v.stage), Principal: v.is_primary ? 'Sim' : 'Não', 'Última atualização': d(v.last_update_at) }))
      },
    },
    {
      key: 'admissions', icon: <ClipboardList />, title: 'Admissões', text: 'Candidatos criados no período, origem, perfil, etapa atual e turma pretendida.', perm: hasPermission('admissions.view'),
      fn: async () => {
        let q = supabase.from('candidates').select('full_name, email, city, profile_type, lead_source, status, created_at, converted_at, target_cohort:cohorts(name)')
          .gte('created_at', range.from.toISOString()).lte('created_at', range.to.toISOString()).order('created_at')
        if (cohort) q = q.eq('target_cohort_id', cohort)
        const { data, error } = await q
        if (error) throw error
        return data.map((c) => ({ Candidato: c.full_name, 'E-mail': c.email ?? '', Cidade: c.city ?? '', Perfil: c.profile_type ? TRACK_LABEL[c.profile_type] : '', Origem: c.lead_source ?? '', Etapa: admissionLabel(c.status), Turma: c.target_cohort?.name ?? '', Criado: d(c.created_at), Matriculado: d(c.converted_at) }))
      },
    },
    {
      key: 'experiences', icon: <Mountain />, title: 'Experiências Neo', text: 'Experiências do período, inscritos, participantes e satisfação média.', perm: hasPermission('events.manage') || hasPermission('reports.view'),
      fn: async () => {
        const { data, error } = await supabase.from('experiences').select('title, category, starts_at, capacity, registrations:experience_registrations(status), reflections:experience_reflections(rating)')
          .gte('starts_at', range.from.toISOString()).lte('starts_at', range.to.toISOString()).order('starts_at')
        if (error) throw error
        return data.map((e) => {
          const ratings = e.reflections.map((r) => r.rating).filter((x): x is number => x !== null)
          return { Experiência: e.title, Categoria: e.category, Data: d(e.starts_at), Vagas: e.capacity ?? '', Inscritos: e.registrations.filter((r) => r.status !== 'canceled').length,
            Participantes: e.registrations.filter((r) => r.status === 'attended').length, 'Satisfação média': ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '' }
        })
      },
    },
  ]

  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Relatórios</h1><p className="mt-1 text-muted-foreground">Exporte em CSV (abre no Excel e no Google Planilhas). Os dados respeitam suas permissões.</p></header>
      <Card><CardContent className="flex flex-wrap items-end gap-3 pt-6">
        <label className="space-y-1 text-xs font-medium">De<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></label>
        <label className="space-y-1 text-xs font-medium">Até<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></label>
        <label className="space-y-1 text-xs font-medium">Turma<Select value={cohort} onChange={(e) => setCohort(e.target.value)} className="w-52"><option value="">Todas</option>{cohorts.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label>
      </CardContent></Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.filter((r) => r.perm).map((r) => (
          <Card key={r.key}><CardContent className="flex h-full flex-col gap-3 pt-6">
            <div className="flex items-center gap-2 text-primary [&>svg]:h-5 [&>svg]:w-5">{r.icon}<h2 className="font-display font-semibold text-foreground">{r.title}</h2></div>
            <p className="flex-1 text-sm text-muted-foreground">{r.text}</p>
            <Button variant="outline" disabled={busy !== null || (r.key === 'kpis' && !exec.data)} onClick={() => run(r.key, r.fn, r.key)}><Download />{busy === r.key ? 'Gerando…' : 'Exportar CSV'}</Button>
          </CardContent></Card>
        ))}
      </div>
    </div>
  )
}
