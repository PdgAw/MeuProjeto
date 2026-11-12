import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { VENTURE_STAGES, stageLabel } from '@/config/labels'
import { fmtRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useVentureList } from '../api'

/** Management: all Neoleader ventures, with the stage distribution. */
export default function VenturesAdminPage() {
  const { data, isPending } = useVentureList()
  const [stage, setStage] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const all = data ?? []
  const list = all.filter((v) => (!stage || v.stage === stage) && (!q || `${v.name} ${v.owner?.full_name} ${v.segment}`.toLowerCase().includes(q.toLowerCase())))
  const max = Math.max(1, ...VENTURE_STAGES.map((s) => all.filter((v) => v.stage === s.key).length))
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Projetos</h1><p className="mt-1 text-muted-foreground">Negócios dos Neoleaders por estágio.</p></header>
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold">Projetos por estágio</p>
        <div className="grid grid-cols-6 items-end gap-2" role="list" aria-label="Projetos por estágio (clique para filtrar)">
          {VENTURE_STAGES.map((s) => {
            const n = all.filter((v) => v.stage === s.key).length
            return (
              <button key={s.key} role="listitem" onClick={() => setStage(stage === s.key ? null : s.key)} className="group flex flex-col items-center gap-1.5" title={`${s.label}: ${n}`}>
                <span className="text-sm font-semibold tabular-nums">{n}</span>
                <span className="flex h-20 w-full items-end">
                  <span className={cn('w-full rounded-t-[4px] transition-colors', stage === s.key ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/70')} style={{ height: `${Math.max(4, (100 * n) / max)}%` }} />
                </span>
                <span className={cn('text-[11px]', stage === s.key ? 'font-semibold text-primary' : 'text-muted-foreground')}>{s.label}</span>
              </button>
            )
          })}
        </div>
      </Card>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar negócio, Neoleader ou segmento" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {isPending ? <CardSkeleton lines={3} /> : !list.length ? <EmptyState text="Nenhum projeto encontrado." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => {
            const done = v.venture_milestones.filter((m) => m.status === 'achieved').length
            const stale = Date.now() - new Date(v.last_update_at).getTime() > 30 * 864e5
            return (
              <Link key={v.id} to={`/negocios/${v.id}`}>
                <Card className="h-full space-y-2 p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2"><p className="font-display text-lg font-semibold">{v.name}</p><Badge>{stageLabel(v.stage)}</Badge></div>
                  <p className="text-sm text-muted-foreground">{v.owner?.full_name}{v.segment ? ` · ${v.segment}` : ''}</p>
                  <p className="text-xs text-muted-foreground">{done}/{v.venture_milestones.length} milestones · atualizado {fmtRelative(v.last_update_at)}</p>
                  {stale && <Badge variant="warning">Sem atualização há 30 dias</Badge>}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
