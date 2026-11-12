import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useSaveAssignment } from '../api'

interface Assignment { id: string; title: string; instructions: string | null; due_at: string | null; status: 'draft' | 'published' | 'closed'; max_score: number | null; cohort_id: string | null }
interface Props { open: boolean; onOpenChange: (o: boolean) => void; subjectId: string; cohorts: { id: string; name: string }[]; assignment?: Assignment | null }

export function AssignmentFormDialog({ open, onOpenChange, subjectId, cohorts, assignment }: Props) {
  const save = useSaveAssignment()
  const [v, setV] = useState({ title: '', instructions: '', due: '', max_score: '10', cohort_id: '', status: 'published' as Assignment['status'] })
  useEffect(() => {
    if (open) setV({
      title: assignment?.title ?? '', instructions: assignment?.instructions ?? '',
      due: assignment?.due_at ? format(new Date(assignment.due_at), "yyyy-MM-dd'T'HH:mm") : '',
      max_score: assignment?.max_score?.toString() ?? '10', cohort_id: assignment?.cohort_id ?? '', status: assignment?.status ?? 'published',
    })
  }, [open, assignment])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (v.title.trim().length < 3) return toast.error('Informe o título.')
    try {
      await save.mutateAsync({
        id: assignment?.id, subject_id: subjectId, title: v.title.trim(), instructions: v.instructions || null,
        due_at: v.due ? new Date(v.due).toISOString() : null, max_score: v.max_score ? Number(v.max_score) : null,
        cohort_id: v.cohort_id || null, status: v.status,
      })
      toast.success(v.status === 'published' ? 'Atividade publicada. Os Neoleaders foram notificados.' : 'Atividade salva.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={assignment ? 'Editar atividade' : 'Nova atividade'}>
        <form onSubmit={submit} className="space-y-4">
          <FormField id="a-title" label="Título"><Input id="a-title" value={v.title} onChange={set('title')} /></FormField>
          <FormField id="a-instr" label="Instruções"><Textarea id="a-instr" rows={4} value={v.instructions} onChange={set('instructions')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="a-due" label="Prazo"><Input id="a-due" type="datetime-local" value={v.due} onChange={set('due')} /></FormField>
            <FormField id="a-max" label="Nota máxima"><Input id="a-max" type="number" min={0} value={v.max_score} onChange={set('max_score')} /></FormField>
            <FormField id="a-cohort" label="Turma">
              <Select id="a-cohort" value={v.cohort_id} onChange={set('cohort_id')}>
                <option value="">Todas as turmas da disciplina</option>
                {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
            <FormField id="a-status" label="Status">
              <Select id="a-status" value={v.status} onChange={set('status')}>
                <option value="draft">Rascunho</option><option value="published">Publicada</option><option value="closed">Encerrada</option>
              </Select>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
