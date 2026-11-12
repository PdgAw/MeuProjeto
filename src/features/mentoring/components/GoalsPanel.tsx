import { Pencil, Plus, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { DIMENSION_LABEL } from '@/features/academic/components/subject/shared'
import { fmtDate, parseLocalDate } from '@/lib/format'
import { useGoals, useSaveGoal, type Goal } from '../api'
import { GOAL_SOURCE, GOAL_STATUS } from './labels'

/** Metas do Neoleader — editable by the Neoleader and their Neomentores. */
export function GoalsPanel({ ownerId, source, sessionId, editable = true }: { ownerId: string; source: Goal['source']; sessionId?: string; editable?: boolean }) {
  const { data, isPending } = useGoals(ownerId)
  const [editing, setEditing] = useState<Goal | null | undefined>(undefined)
  return (
    <div className="space-y-3">
      {editable && <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => setEditing(null)}><Plus /> Nova meta</Button></div>}
      {isPending ? <CardSkeleton lines={2} /> : !data?.length ? <EmptyState icon={<Target className="h-5 w-5" />} text="Nenhuma meta definida." /> : (
        <ul className="space-y-3">
          {data.map((g) => (
            <li key={g.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{g.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant={g.status === 'done' ? 'success' : g.status === 'blocked' ? 'warning' : 'secondary'}>{GOAL_STATUS[g.status]}</Badge>
                    <Badge variant="outline">{GOAL_SOURCE[g.source]}</Badge>
                    <Badge variant="outline">{DIMENSION_LABEL[g.dimension]}</Badge>
                  </div>
                </div>
                {editable && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(g)} aria-label="Editar meta"><Pencil className="h-4 w-4" /></Button>}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={g.status === 'done' ? 100 : g.progress} className="h-1.5" indicatorClassName={g.status === 'done' ? 'bg-success' : undefined} />
                <span className="w-10 text-right text-xs tabular-nums">{g.status === 'done' ? 100 : g.progress}%</span>
              </div>
              {g.due_date && <p className="mt-1 text-xs text-muted-foreground">Prazo: {fmtDate(parseLocalDate(g.due_date))}</p>}
            </li>
          ))}
        </ul>
      )}
      {editing !== undefined && <GoalDialog ownerId={ownerId} source={source} sessionId={sessionId} goal={editing} onClose={() => setEditing(undefined)} />}
    </div>
  )
}

function GoalDialog({ ownerId, source, sessionId, goal, onClose }: { ownerId: string; source: Goal['source']; sessionId?: string; goal: Goal | null; onClose: () => void }) {
  const save = useSaveGoal()
  const [v, setV] = useState({ title: '', description: '', dimension: 'goals', due: '', status: 'not_started', progress: 0 })
  useEffect(() => setV({ title: goal?.title ?? '', description: goal?.description ?? '', dimension: goal?.dimension ?? 'goals', due: goal?.due_date ?? '', status: goal?.status ?? 'not_started', progress: goal?.progress ?? 0 }), [goal])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (v.title.trim().length < 3) return toast.error('Descreva a meta.')
    try {
      await save.mutateAsync({ id: goal?.id, ownerId, title: v.title.trim(), description: v.description || null, dimension: v.dimension as Goal['dimension'], dueDate: v.due || null, status: v.status as Goal['status'], progress: v.progress, source, sessionId })
      toast.success('Meta salva.')
      onClose()
    } catch (err) { toast.error(err instanceof Error ? err.message : String(err)) }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={goal ? 'Editar meta' : 'Nova meta'}>
        <form onSubmit={submit} className="space-y-4">
          <FormField id="g-title" label="Meta"><Input id="g-title" placeholder="Fechar 5 clientes pagantes" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></FormField>
          <FormField id="g-desc" label="Detalhes"><Textarea id="g-desc" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="g-dim" label="Dimensão"><Select id="g-dim" value={v.dimension} onChange={(e) => setV({ ...v, dimension: e.target.value })}>{Object.entries(DIMENSION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
            <FormField id="g-status" label="Status"><Select id="g-status" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>{Object.entries(GOAL_STATUS).filter(([k]) => k !== 'canceled').map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
            <FormField id="g-due" label="Prazo"><Input id="g-due" type="date" value={v.due} onChange={(e) => setV({ ...v, due: e.target.value })} /></FormField>
          </div>
          <FormField id="g-prog" label={`Progresso: ${v.status === 'done' ? 100 : v.progress}%`}>
            <input id="g-prog" type="range" min={0} max={100} step={5} value={v.status === 'done' ? 100 : v.progress} disabled={v.status === 'done'}
              onChange={(e) => setV({ ...v, progress: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
