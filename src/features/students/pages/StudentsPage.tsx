import { Download, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { stageLabel, TRACK_LABEL } from '@/config/labels'
import { RISK_SHORT } from '@/features/cohorts/api'
import { useAllStudents } from '@/features/management/api'
import { downloadCsv } from '@/lib/csv'
import { fmtRelative } from '@/lib/format'
import { cn, initials } from '@/lib/utils'

export default function StudentsPage() {
  const { data, isPending } = useAllStudents()
  const [q, setQ] = useState('')
  const [cohort, setCohort] = useState('')
  const [track, setTrack] = useState('')
  const [risk, setRisk] = useState(false)
  const all = data ?? []
  const cohorts = [...new Map(all.map((s) => [s.cohort_id, s.cohort_name])).entries()]
  const list = all.filter((s) => (!q || s.full_name.toLowerCase().includes(q.toLowerCase()) || (s.venture_name ?? '').toLowerCase().includes(q.toLowerCase()))
    && (!cohort || s.cohort_id === cohort) && (!track || s.track === track) && (!risk || s.risk_flags.length > 0))
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Neoleaders</h1><p className="mt-1 text-muted-foreground">{all.length} Neoleaders · {all.filter((s) => s.risk_flags.length).length} pedem atenção</p></div>
        <Button variant="outline" disabled={!list.length} onClick={() => downloadCsv(list.map((s) => ({ Nome: s.full_name, Turma: s.cohort_name, Trilha: s.track ? TRACK_LABEL[s.track] : '', 'Frequência %': s.attendance_rate ?? '', 'Entregas atrasadas': s.overdue_assignments, Negócio: s.venture_name ?? '', Estágio: s.venture_stage ? stageLabel(s.venture_stage) : '', Neomentor: s.mentor_name ?? '', Alertas: s.risk_flags.map((f) => RISK_SHORT[f]).join(', ') })), 'neoleaders')}>
          <Download /> Exportar CSV
        </Button>
      </header>
      <div className="flex flex-wrap gap-2">
        <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Nome ou negócio" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" /></div>
        <Select className="w-48" value={cohort} onChange={(e) => setCohort(e.target.value)} aria-label="Turma"><option value="">Todas as turmas</option>{cohorts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</Select>
        <Select className="w-48" value={track} onChange={(e) => setTrack(e.target.value)} aria-label="Trilha"><option value="">Todas as trilhas</option>{Object.entries(TRACK_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <button onClick={() => setRisk(!risk)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', risk ? 'border-warning bg-warning/15 text-warning' : 'hover:bg-secondary')}>Só em risco</button>
      </div>
      {isPending ? <CardSkeleton lines={5} /> : !list.length ? <EmptyState text="Nenhum Neoleader encontrado." /> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-2.5">Neoleader</th><th className="px-3 py-2.5">Turma</th><th className="px-3 py-2.5 text-right">Freq.</th><th className="px-3 py-2.5">Negócio</th><th className="px-3 py-2.5">Neomentor</th><th className="px-3 py-2.5">Atividade</th><th className="px-4 py-2.5">Alertas</th></tr>
            </thead>
            <tbody className="divide-y">
              {list.map((s) => (
                <tr key={`${s.cohort_id}-${s.user_id}`} className="hover:bg-secondary/30">
                  <td className="px-4 py-2.5"><Link to={`/gestao/neoleaders/${s.user_id}`} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">{s.avatar_url && <AvatarImage src={s.avatar_url} alt="" />}<AvatarFallback className="text-xs">{initials(s.full_name)}</AvatarFallback></Avatar>
                    <span><span className="block font-medium hover:underline">{s.full_name}</span><span className="text-xs text-muted-foreground">{s.track ? TRACK_LABEL[s.track] : ''}</span></span></Link></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{s.cohort_name}</td>
                  <td className={cn('px-3 py-2.5 text-right tabular-nums', s.risk_flags.includes('low_attendance') && 'font-semibold text-destructive')}>{s.attendance_rate === null ? '—' : `${Math.round(Number(s.attendance_rate))}%`}</td>
                  <td className="px-3 py-2.5">{s.venture_name ? <>{s.venture_name} <span className="text-xs text-muted-foreground">{s.venture_stage && stageLabel(s.venture_stage)}</span></> : '—'}</td>
                  <td className="px-3 py-2.5">{s.mentor_name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.last_activity_at ? fmtRelative(s.last_activity_at) : 'nunca'}</td>
                  <td className="px-4 py-2.5"><div className="flex flex-wrap gap-1">{s.risk_flags.map((f) => <Badge key={f} variant="warning">{RISK_SHORT[f]}</Badge>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
