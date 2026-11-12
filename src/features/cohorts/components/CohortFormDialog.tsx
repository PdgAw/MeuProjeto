import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { usePeopleWithRole } from '@/features/academic/api'
import { useSaveCohort } from '../api'

interface Cohort { id: string; name: string; code: string | null; year: number | null; starts_on: string | null; ends_on: string | null; capacity: number | null; status: 'planned' | 'active' | 'completed' | 'archived'; description: string | null; coordinator_id?: string | null }

export function CohortFormDialog({ open, onOpenChange, cohort, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; cohort?: Cohort | null; onSaved?: (id: string) => void }) {
  const save = useSaveCohort()
  const coordinators = usePeopleWithRole('coordinator')
  const [v, setV] = useState({ name: '', code: '', year: '', starts_on: '', ends_on: '', capacity: '', status: 'planned' as Cohort['status'], description: '', coordinator_id: '' })
  useEffect(() => {
    if (open) setV({
      name: cohort?.name ?? '', code: cohort?.code ?? '', year: cohort?.year?.toString() ?? String(new Date().getFullYear()),
      starts_on: cohort?.starts_on ?? '', ends_on: cohort?.ends_on ?? '', capacity: cohort?.capacity?.toString() ?? '',
      status: cohort?.status ?? 'planned', description: cohort?.description ?? '', coordinator_id: cohort?.coordinator_id ?? '',
    })
  }, [open, cohort])
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (v.name.trim().length < 3) return toast.error('Informe o nome da turma.')
    if (v.starts_on && v.ends_on && v.ends_on < v.starts_on) return toast.error('A conclusão deve ser depois do início.')
    try {
      const id = await save.mutateAsync({
        id: cohort?.id, name: v.name.trim(), code: v.code.trim() || null, year: v.year ? Number(v.year) : null,
        starts_on: v.starts_on || null, ends_on: v.ends_on || null, capacity: v.capacity ? Number(v.capacity) : null,
        status: v.status, description: v.description || null, coordinator_id: v.coordinator_id || null,
      })
      toast.success(cohort ? 'Turma atualizada.' : 'Turma criada.')
      onOpenChange(false)
      onSaved?.(id)
    } catch (err) { toast.error(err instanceof Error ? err.message : String(err)) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={cohort ? 'Editar turma' : 'Nova turma'}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <FormField id="c-name" label="Nome"><Input id="c-name" placeholder="NeoLevel 2027.1" value={v.name} onChange={set('name')} /></FormField>
            <FormField id="c-code" label="Código"><Input id="c-code" value={v.code} onChange={set('code')} /></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="c-year" label="Ano"><Input id="c-year" type="number" value={v.year} onChange={set('year')} /></FormField>
            <FormField id="c-start" label="Início"><Input id="c-start" type="date" value={v.starts_on} onChange={set('starts_on')} /></FormField>
            <FormField id="c-end" label="Conclusão"><Input id="c-end" type="date" value={v.ends_on} onChange={set('ends_on')} /></FormField>
            <FormField id="c-cap" label="Capacidade"><Input id="c-cap" type="number" min={1} value={v.capacity} onChange={set('capacity')} /></FormField>
            <FormField id="c-status" label="Status">
              <Select id="c-status" value={v.status} onChange={set('status')}>
                <option value="planned">Planejada</option><option value="active">Ativa</option><option value="completed">Concluída</option><option value="archived">Arquivada</option>
              </Select>
            </FormField>
            <FormField id="c-coord" label="Coordenador">
              <Select id="c-coord" value={v.coordinator_id} onChange={set('coordinator_id')}>
                <option value="">—</option>
                {coordinators.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField id="c-desc" label="Descrição"><Textarea id="c-desc" rows={2} value={v.description} onChange={set('description')} /></FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
