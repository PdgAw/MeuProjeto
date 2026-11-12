import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { VENTURE_STAGES } from '@/config/labels'
import { useSaveVenture, type VentureDetail } from '../api'

const FIELDS = [
  ['problem', 'Problema', 'Que dor real você resolve? Para quem?'],
  ['solution', 'Solução', 'Como você resolve esse problema?'],
  ['audience', 'Público', 'Quem é o cliente ideal?'],
  ['value_proposition', 'Proposta de valor', 'Por que escolheriam você?'],
  ['revenue_model', 'Modelo de receita', 'Como o negócio ganha dinheiro?'],
  ['team_description', 'Equipe', 'Quem está construindo com você?'],
] as const

type Values = Record<string, string>

export function VentureFormDialog({ open, onOpenChange, ownerId, venture, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; ownerId: string; venture?: VentureDetail | null; onSaved?: (id: string) => void }) {
  const save = useSaveVenture()
  const [v, setV] = useState<Values>({})
  useEffect(() => {
    if (!open) return
    const src = (venture ?? {}) as Record<string, unknown>
    const keys = ['name', 'tagline', 'description', 'segment', 'business_model', 'stage', 'website_url', 'pitch_url', 'visibility', ...FIELDS.map((f) => f[0])]
    setV(Object.fromEntries(keys.map((k) => [k, (src[k] as string) ?? (k === 'stage' ? 'ideation' : k === 'visibility' ? 'private' : '')])))
  }, [open, venture])
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((v.name ?? '').trim().length < 2) return toast.error('Dê um nome ao seu negócio.')
    for (const k of ['website_url', 'pitch_url']) if (v[k] && !/^https?:\/\//.test(v[k])) return toast.error('Links devem começar com https://')
    try {
      const nullIfEmpty = (s: string) => (s?.trim() ? s.trim() : null)
      const id = await save.mutateAsync({
        id: venture?.id, owner_id: venture?.owner_id ?? ownerId, name: v.name.trim(), tagline: nullIfEmpty(v.tagline), description: nullIfEmpty(v.description),
        segment: nullIfEmpty(v.segment), business_model: nullIfEmpty(v.business_model), stage: v.stage as VentureDetail['stage'],
        website_url: nullIfEmpty(v.website_url), pitch_url: nullIfEmpty(v.pitch_url), visibility: v.visibility as VentureDetail['visibility'],
        ...Object.fromEntries(FIELDS.map(([k]) => [k, nullIfEmpty(v[k])])),
      })
      toast.success(venture ? 'Negócio atualizado.' : 'Negócio cadastrado!')
      onOpenChange(false)
      onSaved?.(id)
    } catch (err) { toast.error(err instanceof Error ? err.message : String(err)) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={venture ? 'Editar negócio' : 'Cadastrar meu negócio'} className="sm:max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="v-name" label="Nome"><Input id="v-name" value={v.name ?? ''} onChange={set('name')} /></FormField>
            <FormField id="v-tag" label="Frase de impacto"><Input id="v-tag" placeholder="Do campo para a cozinha" value={v.tagline ?? ''} onChange={set('tagline')} /></FormField>
            <FormField id="v-seg" label="Segmento"><Input id="v-seg" placeholder="AgroTech" value={v.segment ?? ''} onChange={set('segment')} /></FormField>
            <FormField id="v-model" label="Modelo"><Input id="v-model" placeholder="Marketplace B2B, SaaS, Serviço…" value={v.business_model ?? ''} onChange={set('business_model')} /></FormField>
            <FormField id="v-stage" label="Estágio">
              <Select id="v-stage" value={v.stage ?? 'ideation'} onChange={set('stage')}>{VENTURE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
            </FormField>
            <FormField id="v-vis" label="Visibilidade na Comunidade" hint="Dados detalhados nunca são públicos.">
              <Select id="v-vis" value={v.visibility ?? 'private'} onChange={set('visibility')}>
                <option value="private">Privado (só você, Neomentores e coordenação)</option>
                <option value="community">Mostrar nome, segmento e estágio</option>
              </Select>
            </FormField>
          </div>
          <FormField id="v-desc" label="Descrição"><Textarea id="v-desc" rows={2} value={v.description ?? ''} onChange={set('description')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(([k, l, ph]) => <FormField key={k} id={`v-${k}`} label={l}><Textarea id={`v-${k}`} rows={2} placeholder={ph} value={v[k] ?? ''} onChange={set(k)} /></FormField>)}
            <FormField id="v-site" label="Site"><Input id="v-site" type="url" value={v.website_url ?? ''} onChange={set('website_url')} /></FormField>
            <FormField id="v-pitch" label="Link do pitch (vídeo)"><Input id="v-pitch" type="url" value={v.pitch_url ?? ''} onChange={set('pitch_url')} /></FormField>
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
