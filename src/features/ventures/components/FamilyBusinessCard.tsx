import { Building2, Loader2, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { useFamilyBusiness, useSaveFamilyBusiness } from '../api'

const TEXT = [
  ['governance_notes', 'Governança'], ['management_notes', 'Gestão'], ['professionalization_notes', 'Profissionalização'],
  ['succession_notes', 'Sucessão'], ['strategic_plan_notes', 'Plano estratégico'],
] as const
const SHORT = [
  ['company_name', 'Empresa'], ['sector', 'Setor'], ['structure', 'Estrutura'], ['employees_range', 'Colaboradores'],
  ['generation', 'Geração'], ['current_position', 'Papel atual'], ['future_position', 'Papel futuro'],
] as const

/** Trilha Herdeiro / Sucessor: the family company. Sensitive — never shown to peers. */
export function FamilyBusinessCard({ ownerId, editable }: { ownerId: string; editable: boolean }) {
  const { data, isPending } = useFamilyBusiness(ownerId)
  const save = useSaveFamilyBusiness()
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState<Record<string, string>>({})
  const [share, setShare] = useState(true)
  useEffect(() => {
    if (data !== undefined) {
      const src = (data ?? {}) as Record<string, unknown>
      setV(Object.fromEntries([...SHORT, ...TEXT].map(([k]) => [k, (src[k] as string) ?? ''])))
      setShare(data?.share_with_mentors ?? true)
      if (!data) setEditing(editable)
    }
  }, [data, editable])
  if (isPending) return <CardSkeleton lines={3} />
  if (editing) {
    return (
      <Card><CardContent className="pt-5">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          if (!v.company_name?.trim()) return toast.error('Informe o nome da empresa.')
          save.mutate({ owner_id: ownerId, company_name: v.company_name.trim(), share_with_mentors: share,
            ...Object.fromEntries([...SHORT, ...TEXT].filter(([k]) => k !== 'company_name').map(([k]) => [k, v[k]?.trim() || null])) },
            { onSuccess: () => { toast.success('Empresa familiar salva.'); setEditing(false) }, onError: (er) => toast.error(er.message) })
        }}>
          <div className="grid gap-4 sm:grid-cols-2">{SHORT.map(([k, l]) => <FormField key={k} id={`fb-${k}`} label={l}><Input id={`fb-${k}`} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></FormField>)}</div>
          <div className="grid gap-4 sm:grid-cols-2">{TEXT.map(([k, l]) => <FormField key={k} id={`fb-${k}`} label={l}><Textarea id={`fb-${k}`} rows={2} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></FormField>)}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />Compartilhar com meus Neomentores</label>
          <div className="flex justify-end gap-2">{data && <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>}<Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}Salvar</Button></div>
        </form>
      </CardContent></Card>
    )
  }
  if (!data) return <Card className="p-6 text-sm text-muted-foreground">Empresa familiar ainda não cadastrada.</Card>
  return (
    <Card><CardContent className="space-y-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3"><Building2 className="h-8 w-8 text-primary" /><div><p className="font-display text-xl font-semibold">{data.company_name}</p><p className="text-sm text-muted-foreground">{[data.sector, data.generation].filter(Boolean).join(' · ')}</p></div></div>
        {editable && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil /> Editar</Button>}
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">{SHORT.slice(2).map(([k, l]) => <div key={k}><dt className="text-xs text-muted-foreground">{l}</dt><dd className="font-medium">{(data as Record<string, unknown>)[k] as string || '—'}</dd></div>)}</dl>
      <div className="grid gap-3 sm:grid-cols-2">{TEXT.map(([k, l]) => <div key={k} className="rounded-lg bg-secondary/50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{l}</p><p className="mt-1 whitespace-pre-line text-sm">{(data as Record<string, unknown>)[k] as string || <span className="text-muted-foreground">A preencher</span>}</p></div>)}</div>
      <p className="text-xs text-muted-foreground">{data.share_with_mentors ? 'Compartilhado com seus Neomentores e a coordenação.' : 'Visível só para você e a coordenação.'} Nunca aparece para outros Neoleaders.</p>
    </CardContent></Card>
  )
}
