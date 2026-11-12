import { Plus, Target, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/SectionCard'
import { fmtDayMonth, parseLocalDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDeleteRow, useSaveAction, useSaveKeyResult, useSaveObjective, type Objective, type VentureAction, type VentureDetail } from '../api'
import { CommentsThread } from './CommentsThread'

const STATUS = { not_started: 'Não iniciado', in_progress: 'Em andamento', blocked: 'Bloqueado', done: 'Concluído' } as const
const STATUS_TONE: Record<keyof typeof STATUS, string> = {
  not_started: 'bg-secondary text-secondary-foreground', in_progress: 'bg-primary/10 text-primary',
  blocked: 'bg-warning/15 text-warning', done: 'bg-success/12 text-success',
}

/** Plano de Execução: Objetivo → Key Results → Ações (responsável, prazo, status) + comentários. */
export function ExecutionPlan({ venture, editable }: { venture: VentureDetail; editable: boolean }) {
  const saveObj = useSaveObjective(venture.id)
  const [title, setTitle] = useState('')
  const objectives = [...venture.venture_objectives].sort((a, b) => a.sort_order - b.sort_order)
  const actions = venture.venture_actions
  const total = actions.length
  const done = actions.filter((a) => a.status === 'done').length
  const blocked = actions.filter((a) => a.status === 'blocked').length
  return (
    <div className="space-y-5">
      {total > 0 && (
        <div className="flex flex-wrap gap-6 text-sm">
          <span><strong className="font-display text-xl">{done}</strong>/{total} ações concluídas</span>
          {blocked > 0 && <span className="text-warning"><strong className="font-display text-xl">{blocked}</strong> bloqueada{blocked > 1 ? 's' : ''}</span>}
        </div>
      )}
      {!objectives.length && <EmptyState icon={<Target className="h-5 w-5" />} text="Crie um objetivo para os próximos meses e quebre em key results e ações." />}
      {objectives.map((o) => <ObjectiveCard key={o.id} venture={venture} objective={o} actions={actions.filter((a) => a.objective_id === o.id)} editable={editable} />)}
      {editable && (
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault()
          if (title.trim().length < 3) return
          saveObj.mutate({ title: title.trim(), sort_order: objectives.length + 1, status: 'in_progress' }, { onSuccess: () => setTitle(''), onError: (er) => toast.error(er.message) })
        }}>
          <Input placeholder="Novo objetivo (ex.: Conquistar os primeiros clientes pagantes)" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Novo objetivo" />
          <Button type="submit" disabled={saveObj.isPending}><Plus /> Objetivo</Button>
        </form>
      )}
    </div>
  )
}

function ObjectiveCard({ venture, objective: o, actions, editable }: { venture: VentureDetail; objective: Objective; actions: VentureAction[]; editable: boolean }) {
  const saveKr = useSaveKeyResult(venture.id)
  const saveAction = useSaveAction(venture.id)
  const del = useDeleteRow(venture.id)
  const [kr, setKr] = useState({ title: '', target: '' })
  const [act, setAct] = useState({ title: '', due: '', owner: '' })
  const krs = [...o.venture_key_results].sort((a, b) => a.sort_order - b.sort_order)
  const sortedActions = [...actions].sort((a, b) => a.sort_order - b.sort_order)
  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Objetivo</p>
          <p className="font-display text-lg font-semibold">{o.title}</p>
          {(o.period_label || o.due_date) && <p className="text-xs text-muted-foreground">{[o.period_label, o.due_date && `até ${fmtDayMonth(parseLocalDate(o.due_date))}`].filter(Boolean).join(' · ')}</p>}
        </div>
        {editable && <Button size="icon" variant="ghost" aria-label="Remover objetivo" onClick={() => { if (confirm(`Remover o objetivo "${o.title}" com seus KRs e ações?`)) del.mutate({ table: 'venture_objectives', id: o.id }) }}><Trash2 className="h-4 w-4" /></Button>}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Key Results</p>
        {krs.map((k) => {
          const span = Number(k.target_value) - Number(k.start_value)
          const pct = span ? Math.max(0, Math.min(100, (100 * (Number(k.current_value) - Number(k.start_value))) / span)) : 0
          return (
            <div key={k.id} className="grid items-center gap-2 sm:grid-cols-[1fr_9rem_3rem]">
              <p className="text-sm">{k.title}</p>
              {editable ? (
                <div className="flex items-center gap-1 text-xs">
                  <Input type="number" className="h-8 w-20 text-right" defaultValue={Number(k.current_value)} aria-label={`Valor atual de ${k.title}`}
                    onBlur={(e) => { const n = Number(e.target.value); if (n !== Number(k.current_value)) saveKr.mutate({ id: k.id, objective_id: o.id, title: k.title, target_value: Number(k.target_value), current_value: n }) }} />
                  <span className="text-muted-foreground">/ {Number(k.target_value).toLocaleString('pt-BR')}</span>
                </div>
              ) : <p className="text-xs tabular-nums text-muted-foreground">{Number(k.current_value).toLocaleString('pt-BR')} / {Number(k.target_value).toLocaleString('pt-BR')} {k.unit}</p>}
              <span className="text-right text-xs font-medium tabular-nums">{Math.round(pct)}%</span>
              <Progress value={pct} className="h-1.5 sm:col-span-3" />
            </div>
          )
        })}
        {editable && (
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault()
            if (!kr.title.trim() || !kr.target) return toast.error('Informe o KR e a meta.')
            saveKr.mutate({ objective_id: o.id, title: kr.title.trim(), target_value: Number(kr.target), sort_order: krs.length + 1 }, { onSuccess: () => setKr({ title: '', target: '' }) })
          }}>
            <Input className="h-9" placeholder="Novo key result" value={kr.title} onChange={(e) => setKr({ ...kr, title: e.target.value })} aria-label="Novo key result" />
            <Input className="h-9 w-24" type="number" placeholder="Meta" value={kr.target} onChange={(e) => setKr({ ...kr, target: e.target.value })} aria-label="Meta do key result" />
            <Button size="sm" type="submit" variant="outline"><Plus /></Button>
          </form>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Ações</p>
        <ul className="divide-y rounded-lg border">
          {sortedActions.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', a.status === 'done' && 'text-muted-foreground line-through')}>{a.title}</p>
                <p className="text-xs text-muted-foreground">{[a.owner_name && `Resp.: ${a.owner_name}`, a.due_date && `Prazo ${fmtDayMonth(parseLocalDate(a.due_date))}`].filter(Boolean).join(' · ')}</p>
              </div>
              {editable ? (
                <Select className={cn('h-8 w-40 text-xs font-medium', STATUS_TONE[a.status])} value={a.status} aria-label={`Status de ${a.title}`}
                  onChange={(e) => saveAction.mutate({ id: a.id, status: e.target.value as VentureAction['status'] })}>
                  {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              ) : <Badge className={STATUS_TONE[a.status]}>{STATUS[a.status]}</Badge>}
            </li>
          ))}
          {!sortedActions.length && <li className="px-3 py-2.5 text-sm text-muted-foreground">Nenhuma ação ainda.</li>}
        </ul>
        {editable && (
          <form className="grid gap-2 sm:grid-cols-[1fr_9rem_9rem_auto]" onSubmit={(e) => {
            e.preventDefault()
            if (!act.title.trim()) return
            saveAction.mutate({ objective_id: o.id, title: act.title.trim(), due_date: act.due || null, owner_name: act.owner || null, sort_order: actions.length + 1 }, { onSuccess: () => setAct({ title: '', due: '', owner: '' }) })
          }}>
            <Input className="h-9" placeholder="Nova ação" value={act.title} onChange={(e) => setAct({ ...act, title: e.target.value })} aria-label="Nova ação" />
            <Input className="h-9" placeholder="Responsável" value={act.owner} onChange={(e) => setAct({ ...act, owner: e.target.value })} aria-label="Responsável" />
            <Input className="h-9" type="date" value={act.due} onChange={(e) => setAct({ ...act, due: e.target.value })} aria-label="Prazo" />
            <Button size="sm" type="submit" variant="outline"><Plus /> Ação</Button>
          </form>
        )}
      </div>
      <div className="border-t pt-4"><CommentsThread ventureId={venture.id} comments={venture.venture_comments} objectiveId={o.id} compact /></div>
    </Card>
  )
}
