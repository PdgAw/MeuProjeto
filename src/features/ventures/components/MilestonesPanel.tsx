import { CheckCircle2, Circle, Flag, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/shared/SectionCard'
import { cn } from '@/lib/utils'
import { useAddMilestones, useDeleteRow, useMilestoneTemplates, useSetMilestoneStatus, type VentureDetail } from '../api'

export function MilestonesPanel({ venture, editable, track }: { venture: VentureDetail; editable: boolean; track: 'founder' | 'successor' | 'other' | null }) {
  const setStatus = useSetMilestoneStatus(venture.id)
  const del = useDeleteRow(venture.id)
  const [adding, setAdding] = useState(false)
  const list = [...venture.venture_milestones].sort((a, b) => a.sort_order - b.sort_order)
  const done = list.filter((m) => m.status === 'achieved').length
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-48 flex-1"><p className="mb-1.5 text-sm"><span className="font-semibold">{done}</span> de {list.length} milestones conquistados</p><Progress value={list.length ? (100 * done) / list.length : 0} /></div>
        {editable && <Button variant="outline" onClick={() => setAdding(true)}><Plus /> Adicionar milestone</Button>}
      </div>
      {!list.length ? <EmptyState icon={<Flag className="h-5 w-5" />} text="Defina os marcos do seu negócio: primeira entrevista, MVP, primeiro cliente…" /> : (
        <ol className="space-y-2">
          {list.map((m) => (
            <li key={m.id} className={cn('flex items-center gap-3 rounded-lg border bg-card p-3', m.status === 'achieved' && 'border-success/30 bg-success/5')}>
              <button disabled={!editable} onClick={() => setStatus.mutate({ id: m.id, status: m.status === 'achieved' ? 'pending' : 'achieved' }, { onSuccess: () => m.status === 'pending' && toast.success(`Milestone conquistado: ${m.title} 🎉`) })}
                aria-label={m.status === 'achieved' ? `Desmarcar ${m.title}` : `Marcar ${m.title} como conquistado`} className="disabled:cursor-default">
                {m.status === 'achieved' ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.title}</p>
                {m.achieved_at && <p className="text-xs text-muted-foreground">Conquistado em {format(new Date(m.achieved_at), "dd 'de' MMM yyyy", { locale: ptBR })}</p>}
              </div>
              {editable && <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Remover" onClick={() => { if (confirm(`Remover "${m.title}"?`)) del.mutate({ table: 'venture_milestones', id: m.id }) }}><Trash2 className="h-4 w-4" /></Button>}
            </li>
          ))}
        </ol>
      )}
      {adding && <AddMilestones venture={venture} track={track} onClose={() => setAdding(false)} />}
    </div>
  )
}

function AddMilestones({ venture, track, onClose }: { venture: VentureDetail; track: 'founder' | 'successor' | 'other' | null; onClose: () => void }) {
  const templates = useMilestoneTemplates(track)
  const add = useAddMilestones(venture.id)
  const used = new Set(venture.venture_milestones.map((m) => m.template_id))
  const [picked, setPicked] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const available = (templates.data ?? []).filter((t) => !used.has(t.id))
  const base = venture.venture_milestones.length
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Adicionar milestones" description="Use os marcos sugeridos pela NeoLevel ou crie os seus.">
        <div className="space-y-2">
          {available.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5 text-sm hover:bg-secondary/50">
              <input type="checkbox" checked={picked.includes(t.id)} onChange={() => setPicked(picked.includes(t.id) ? picked.filter((x) => x !== t.id) : [...picked, t.id])} className="h-4 w-4 accent-[hsl(var(--primary))]" />
              {t.title}
            </label>
          ))}
          <Input placeholder="Milestone personalizado (opcional)" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Milestone personalizado" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={add.isPending || (!picked.length && !custom.trim())} onClick={() => {
            const rows = [...available.filter((t) => picked.includes(t.id)).map((t, i) => ({ title: t.title, template_id: t.id, sort_order: base + i + 1 })),
              ...(custom.trim() ? [{ title: custom.trim(), sort_order: base + picked.length + 1 }] : [])]
            add.mutate(rows, { onSuccess: () => { toast.success('Milestones adicionados.'); onClose() }, onError: (e) => toast.error(e.message) })
          }}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
