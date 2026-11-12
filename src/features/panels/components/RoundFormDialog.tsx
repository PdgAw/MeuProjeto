import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useSaveRound, type RoundDetail } from '../api'
import { ROUND_STATUS } from './labels'

const dt = (s: string | null | undefined) => (s ? format(new Date(s), "yyyy-MM-dd'T'HH:mm") : '')
const iso = (s: string) => (s ? new Date(s).toISOString() : null)

export function RoundFormDialog({ open, onOpenChange, round, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; round?: RoundDetail | null; onSaved?: (id: string) => void }) {
  const save = useSaveRound()
  const [v, setV] = useState({ name: '', description: '', status: 'draft', open_at: '', close_at: '', panel_date: '', location: '' })
  useEffect(() => {
    if (open) setV({ name: round?.name ?? '', description: round?.description ?? '', status: round?.status ?? 'draft', open_at: dt(round?.submissions_open_at), close_at: dt(round?.submissions_close_at), panel_date: dt(round?.panel_date), location: round?.location ?? '' })
  }, [open, round])
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={round ? 'Editar banca' : 'Nova banca'}>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault()
          if (v.name.trim().length < 3) return toast.error('Informe o nome da banca.')
          try {
            const { data: me } = await supabase.auth.getUser()
            const id = await save.mutateAsync({ id: round?.id, name: v.name.trim(), description: v.description || null, status: v.status as RoundDetail['status'],
              submissions_open_at: iso(v.open_at), submissions_close_at: iso(v.close_at), panel_date: iso(v.panel_date), location: v.location || null, ...(round ? {} : { created_by: me.user?.id }) })
            toast.success(round ? 'Banca atualizada.' : 'Banca criada. Agora configure critérios e avaliadores.')
            onOpenChange(false); onSaved?.(id)
          } catch (er) { toast.error(er instanceof Error ? er.message : String(er)) }
        }}>
          <FormField id="rd-name" label="Nome"><Input id="rd-name" placeholder="Banca de Validação 2027.1" value={v.name} onChange={set('name')} /></FormField>
          <FormField id="rd-desc" label="Descrição"><Textarea id="rd-desc" rows={2} value={v.description} onChange={set('description')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="rd-status" label="Status"><Select id="rd-status" value={v.status} onChange={set('status')}>{Object.entries(ROUND_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
            <FormField id="rd-loc" label="Local"><Input id="rd-loc" value={v.location} onChange={set('location')} /></FormField>
            <FormField id="rd-open" label="Inscrições abrem"><Input id="rd-open" type="datetime-local" value={v.open_at} onChange={set('open_at')} /></FormField>
            <FormField id="rd-close" label="Inscrições fecham"><Input id="rd-close" type="datetime-local" value={v.close_at} onChange={set('close_at')} /></FormField>
            <FormField id="rd-date" label="Data da banca"><Input id="rd-date" type="datetime-local" value={v.panel_date} onChange={set('panel_date')} /></FormField>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
