import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TRACK_LABEL } from '@/config/labels'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { Database } from '@/types/database'
import { ADMISSION_COLUMNS, useCohortOptions, useSaveCandidate, type CandidateInsert } from './api'

type Candidate = Database['public']['Tables']['candidates']['Row']

const EMPTY: CandidateInsert = { full_name: '', email: '', phone: '', city: '', profile_type: 'founder', company: '', entrepreneurial_stage: '', lead_source: '', goals: '', experience: '', notes: '', status: 'new_lead', target_cohort_id: null }

/** Create or edit a candidate (lead / application). */
export function CandidateFormDialog({ candidate, trigger, onSaved }: { candidate?: Candidate; trigger: ReactNode; onSaved?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<CandidateInsert>(EMPTY)
  const cohorts = useCohortOptions()
  const save = useSaveCandidate()
  const { user } = useAuth()
  const set = (k: keyof CandidateInsert) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }))
  const onOpen = (o: boolean) => {
    setOpen(o)
    if (o) setV(candidate ? { ...EMPTY, ...Object.fromEntries(Object.entries(candidate).filter(([k]) => k in EMPTY).map(([k, x]) => [k, x ?? ''])) } : EMPTY)
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (v.full_name.trim().length < 3) return toast.error('Informe o nome completo.')
    const clean = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x === '' ? null : x])) as CandidateInsert
    save.mutate({ ...clean, full_name: v.full_name.trim(), id: candidate?.id, ...(candidate ? {} : { owner_id: user?.user_id }) }, {
      onSuccess: (id) => { toast.success(candidate ? 'Candidato atualizado.' : 'Candidato cadastrado.'); setOpen(false); onSaved?.(id) },
      onError: (er) => toast.error(er.message.includes('candidates_email_idx') ? 'Já existe um candidato com este e-mail.' : er.message),
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <span onClick={() => onOpen(true)}>{trigger}</span>
      <DialogContent title={candidate ? 'Editar candidato' : 'Novo candidato'} className="sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><FormField id="c-name" label="Nome completo"><Input id="c-name" value={v.full_name} onChange={set('full_name')} required /></FormField></div>
          <FormField id="c-email" label="E-mail"><Input id="c-email" type="email" value={v.email ?? ''} onChange={set('email')} /></FormField>
          <FormField id="c-phone" label="Telefone"><Input id="c-phone" value={v.phone ?? ''} onChange={set('phone')} /></FormField>
          <FormField id="c-city" label="Cidade"><Input id="c-city" value={v.city ?? ''} onChange={set('city')} /></FormField>
          <FormField id="c-type" label="Perfil"><Select id="c-type" value={v.profile_type ?? ''} onChange={set('profile_type')}>{Object.entries(TRACK_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
          <FormField id="c-company" label="Empresa / negócio"><Input id="c-company" value={v.company ?? ''} onChange={set('company')} /></FormField>
          <FormField id="c-stage" label="Momento empreendedor"><Input id="c-stage" value={v.entrepreneurial_stage ?? ''} onChange={set('entrepreneurial_stage')} placeholder="Ex.: ideia, validando, já fatura" /></FormField>
          <FormField id="c-source" label="Origem do lead"><Input id="c-source" value={v.lead_source ?? ''} onChange={set('lead_source')} placeholder="Ex.: indicação, Instagram, evento" /></FormField>
          <FormField id="c-cohort" label="Turma pretendida"><Select id="c-cohort" value={v.target_cohort_id ?? ''} onChange={set('target_cohort_id')}><option value="">—</option>{cohorts.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormField>
          {!candidate && <FormField id="c-status" label="Etapa inicial"><Select id="c-status" value={v.status ?? 'new_lead'} onChange={set('status')}>{ADMISSION_COLUMNS.slice(0, 3).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></FormField>}
          <div className="sm:col-span-2"><FormField id="c-goals" label="Objetivos"><Textarea id="c-goals" rows={2} value={v.goals ?? ''} onChange={set('goals')} /></FormField></div>
          <div className="sm:col-span-2"><FormField id="c-exp" label="Experiência"><Textarea id="c-exp" rows={2} value={v.experience ?? ''} onChange={set('experience')} /></FormField></div>
          <div className="sm:col-span-2"><FormField id="c-notes" label="Observações internas"><Textarea id="c-notes" rows={2} value={v.notes ?? ''} onChange={set('notes')} /></FormField></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>Salvar</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
