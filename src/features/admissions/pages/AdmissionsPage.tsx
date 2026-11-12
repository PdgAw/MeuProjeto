import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { TRACK_LABEL } from '@/config/labels'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ADMISSION_COLUMNS, useCandidates } from '../api'
import { CandidateFormDialog } from '../components'

const TONE: Partial<Record<string, string>> = { approved: 'border-t-success', enrolled: 'border-t-primary', rejected: 'border-t-destructive', waitlist: 'border-t-warning' }

/** Pipeline de admissões em kanban: lead → inscrição → triagem → entrevista → comitê → decisão → matrícula. */
export default function AdmissionsPage() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const { data, isPending } = useCandidates()
  const [q, setQ] = useState('')
  const [hideClosed, setHideClosed] = useState(true)
  const list = (data ?? []).filter((c) => !q || c.full_name.toLowerCase().includes(q.toLowerCase()) || (c.email ?? '').toLowerCase().includes(q.toLowerCase()))
  const cols = ADMISSION_COLUMNS.filter((c) => !hideClosed || (c.key !== 'rejected' && c.key !== 'enrolled'))
  const open = (data ?? []).filter((c) => !['rejected', 'enrolled'].includes(c.status)).length
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Admissões</h1><p className="mt-1 text-muted-foreground">{open} candidatos em processo · {(data ?? []).filter((c) => c.status === 'enrolled').length} matriculados</p></div>
        {hasPermission('admissions.manage') && <CandidateFormDialog trigger={<Button><Plus />Novo candidato</Button>} onSaved={(id) => navigate(`/gestao/admissoes/${id}`)} />}
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar candidato" /></div>
        <button onClick={() => setHideClosed(!hideClosed)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', !hideClosed ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-secondary')}>Mostrar encerrados</button>
      </div>
      {isPending ? <CardSkeleton lines={5} /> : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="flex gap-3" style={{ minWidth: `${cols.length * 15.5}rem` }}>
            {cols.map((col) => {
              const items = list.filter((c) => c.status === col.key)
              return (
                <section key={col.key} aria-label={col.label} className={cn('flex w-60 shrink-0 flex-col rounded-lg border border-t-4 bg-muted/40', TONE[col.key] ?? 'border-t-border')}>
                  <h2 className="flex items-center justify-between px-3 py-2 text-sm font-semibold">{col.label}<span className="rounded-full bg-background px-2 text-xs tabular-nums text-muted-foreground">{items.length}</span></h2>
                  <ul className="flex-1 space-y-2 px-2 pb-2">
                    {items.map((c) => (
                      <li key={c.id}><Link to={`/gestao/admissoes/${c.id}`} className="block rounded-md border bg-card p-3 text-sm shadow-sm transition hover:border-primary/50">
                        <p className="font-medium">{c.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.city ?? c.email ?? '—'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {c.profile_type && <Badge variant="outline" className="text-[10px]">{TRACK_LABEL[c.profile_type]}</Badge>}
                          {c.target_cohort && <Badge variant="secondary" className="text-[10px]">{c.target_cohort.name}</Badge>}
                        </div>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">{c.owner?.full_name ? `${c.owner.full_name} · ` : ''}{fmtRelative(c.updated_at)}</p>
                      </Link></li>
                    ))}
                    {!items.length && <li className="px-1 py-3 text-center text-xs text-muted-foreground">—</li>}
                  </ul>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
