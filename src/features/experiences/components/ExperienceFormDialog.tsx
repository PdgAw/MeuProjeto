import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCohorts } from '@/features/academic/api'
import { supabase } from '@/lib/supabase'
import { useSaveExperience, type ExperienceDetail } from '../api'
import { CATEGORY } from './labels'

const dt = (s: string | null | undefined) => (s ? format(new Date(s), "yyyy-MM-dd'T'HH:mm") : '')

export function ExperienceFormDialog({ open, onOpenChange, experience, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; experience?: ExperienceDetail | null; onSaved?: (id: string) => void }) {
  const save = useSaveExperience()
  const cohorts = useCohorts()
  const [v, setV] = useState<Record<string, string>>({})
  useEffect(() => {
    if (open) setV({
      category: experience?.category ?? 'company_visit', title: experience?.title ?? '', description: experience?.description ?? '',
      starts_at: dt(experience?.starts_at), ends_at: dt(experience?.ends_at), location: experience?.location ?? '', capacity: experience?.capacity?.toString() ?? '',
      guests: experience?.guests ?? '', companies: experience?.companies.join(', ') ?? '', cohort_id: experience?.cohort_id ?? '',
      deadline: dt(experience?.registration_deadline), status: experience?.status ?? 'published',
    })
  }, [open, experience])
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={experience ? 'Editar experiência' : 'Nova Experiência Neo'} className="sm:max-w-2xl">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault()
          if ((v.title ?? '').trim().length < 3 || !v.starts_at) return toast.error('Informe título e data de início.')
          try {
            const { data: me } = await supabase.auth.getUser()
            const id = await save.mutateAsync({
              id: experience?.id, category: v.category as ExperienceDetail['category'], title: v.title.trim(), description: v.description || null,
              starts_at: new Date(v.starts_at).toISOString(), ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null, location: v.location || null,
              capacity: v.capacity ? Number(v.capacity) : null, guests: v.guests || null, companies: v.companies.split(',').map((c) => c.trim()).filter(Boolean),
              cohort_id: v.cohort_id || null, registration_deadline: v.deadline ? new Date(v.deadline).toISOString() : null,
              status: v.status as ExperienceDetail['status'], ...(experience ? {} : { owner_id: me.user?.id }),
            })
            toast.success(experience ? 'Experiência atualizada.' : 'Experiência publicada.')
            onOpenChange(false); onSaved?.(id)
          } catch (er) { toast.error(er instanceof Error ? er.message : String(er)) }
        }}>
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <FormField id="x-cat" label="Categoria"><Select id="x-cat" value={v.category} onChange={set('category')}>{Object.entries(CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
            <FormField id="x-title" label="Nome"><Input id="x-title" value={v.title ?? ''} onChange={set('title')} /></FormField>
          </div>
          <FormField id="x-desc" label="Descrição"><Textarea id="x-desc" rows={3} value={v.description ?? ''} onChange={set('description')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="x-start" label="Início"><Input id="x-start" type="datetime-local" value={v.starts_at ?? ''} onChange={set('starts_at')} /></FormField>
            <FormField id="x-end" label="Término"><Input id="x-end" type="datetime-local" value={v.ends_at ?? ''} onChange={set('ends_at')} /></FormField>
            <FormField id="x-loc" label="Local"><Input id="x-loc" value={v.location ?? ''} onChange={set('location')} /></FormField>
            <FormField id="x-cap" label="Capacidade" hint="Vazio = sem limite. Excedentes entram na lista de espera."><Input id="x-cap" type="number" min={1} value={v.capacity ?? ''} onChange={set('capacity')} /></FormField>
            <FormField id="x-comp" label="Empresas" hint="Separe por vírgulas"><Input id="x-comp" value={v.companies ?? ''} onChange={set('companies')} /></FormField>
            <FormField id="x-guests" label="Convidados"><Input id="x-guests" value={v.guests ?? ''} onChange={set('guests')} /></FormField>
            <FormField id="x-cohort" label="Público"><Select id="x-cohort" value={v.cohort_id ?? ''} onChange={set('cohort_id')}><option value="">Todos os Neoleaders</option>{cohorts.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormField>
            <FormField id="x-dead" label="Inscrições até"><Input id="x-dead" type="datetime-local" value={v.deadline ?? ''} onChange={set('deadline')} /></FormField>
            <FormField id="x-status" label="Status"><Select id="x-status" value={v.status} onChange={set('status')}><option value="draft">Rascunho</option><option value="published">Publicada</option><option value="completed">Realizada</option><option value="canceled">Cancelada</option></Select></FormField>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
