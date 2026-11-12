import { Loader2, Lock, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCompleteSession, type Session } from '../api'

/** Closing a session creates the "Próximos passos" automatically, with a deadline. */
export function CompleteSessionDialog({ open, onOpenChange, session }: { open: boolean; onOpenChange: (o: boolean) => void; session: Session }) {
  const complete = useCompleteSession()
  const [v, setV] = useState({ summary: '', difficulties: '', decisions: '', privateNote: '', due: '14' })
  const [steps, setSteps] = useState<string[]>([''])
  useEffect(() => {
    if (open) { setV({ summary: session.summary ?? '', difficulties: session.difficulties ?? '', decisions: session.decisions ?? '', privateNote: '', due: '14' }); setSteps(['']) }
  }, [open, session])
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!v.summary.trim()) return toast.error('Escreva um resumo da sessão.')
    try {
      await complete.mutateAsync({ id: session.id, summary: v.summary.trim(), difficulties: v.difficulties, decisions: v.decisions, nextSteps: steps.map((s) => s.trim()).filter(Boolean), dueInDays: Number(v.due), privateNote: v.privateNote })
      toast.success('Mentoria concluída. Os próximos passos foram enviados ao Neoleader.')
      onOpenChange(false)
    } catch (err) { toast.error(err instanceof Error ? err.message : String(err)) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Concluir mentoria" description={`Com ${session.student?.full_name}. O registro compartilhado fica visível para o Neoleader.`} className="sm:max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <FormField id="c-sum" label="Resumo"><Textarea id="c-sum" rows={3} value={v.summary} onChange={set('summary')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="c-dif" label="Dificuldades"><Textarea id="c-dif" rows={2} value={v.difficulties} onChange={set('difficulties')} /></FormField>
            <FormField id="c-dec" label="Decisões"><Textarea id="c-dec" rows={2} value={v.decisions} onChange={set('decisions')} /></FormField>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Próximos passos</p>
              <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Prazo</span>
                <Select aria-label="Prazo" className="h-8 w-28" value={v.due} onChange={set('due')}>{[7, 14, 21, 30].map((d) => <option key={d} value={d}>{d} dias</option>)}</Select></div>
            </div>
            {steps.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input aria-label={`Passo ${i + 1}`} placeholder={['Entrevistar 10 clientes', 'Revisar pricing', 'Atualizar projeção financeira'][i] ?? 'Próximo passo'} value={s}
                  onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))} />
                {steps.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label="Remover passo"><X /></Button>}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setSteps([...steps, ''])}><Plus /> Adicionar passo</Button>
          </div>
          <FormField id="c-priv" label={<span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Nota privada do Neomentor</span> }
            hint="Nunca visível para o Neoleader.">
            <Textarea id="c-priv" rows={2} value={v.privateNote} onChange={set('privateNote')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={complete.isPending}>{complete.isPending && <Loader2 className="animate-spin" />}Concluir mentoria</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
