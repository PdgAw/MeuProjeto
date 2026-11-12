import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useSaveProfessional, type Professional } from '../api'

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

export function ProfessionalFormDialog({ open, onOpenChange, person }: { open: boolean; onOpenChange: (o: boolean) => void; person: Professional }) {
  const save = useSaveProfessional()
  const [v, setV] = useState({ headline: '', company: '', position: '', bio: '', specialties: '', areas: '', linkedin: '', site: '' })
  useEffect(() => {
    if (!open) return
    const p = person.pro
    setV({
      headline: p?.headline ?? '', company: p?.company ?? person.company ?? '', position: p?.position ?? person.job_title ?? '',
      bio: p?.bio ?? '', specialties: p?.specialties.join(', ') ?? '', areas: p?.areas.join(', ') ?? '',
      linkedin: p?.links.find((l) => l.label === 'LinkedIn')?.url ?? '', site: p?.links.find((l) => l.label === 'Site')?.url ?? '',
    })
  }, [open, person])
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const links = [v.linkedin && { label: 'LinkedIn', url: v.linkedin }, v.site && { label: 'Site', url: v.site }].filter(Boolean) as { label: string; url: string }[]
    if (links.some((l) => !/^https?:\/\//.test(l.url))) return toast.error('Links devem começar com https://')
    try {
      await save.mutateAsync({ userId: person.id, headline: v.headline, company: v.company, position: v.position, bio: v.bio,
        specialties: list(v.specialties), areas: list(v.areas), links, is_guest: person.pro?.is_guest ?? false })
      toast.success('Perfil atualizado.')
      onOpenChange(false)
    } catch (err) { toast.error(err instanceof Error ? err.message : String(err)) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Perfil profissional">
        <form onSubmit={submit} className="space-y-4">
          <FormField id="p-head" label="Título profissional"><Input id="p-head" placeholder="Estrategista e professor convidado" value={v.headline} onChange={set('headline')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="p-pos" label="Cargo"><Input id="p-pos" value={v.position} onChange={set('position')} /></FormField>
            <FormField id="p-comp" label="Empresa"><Input id="p-comp" value={v.company} onChange={set('company')} /></FormField>
          </div>
          <FormField id="p-spec" label="Especialidades" hint="Separe por vírgulas"><Input id="p-spec" value={v.specialties} onChange={set('specialties')} /></FormField>
          <FormField id="p-areas" label="Áreas de atuação" hint="Separe por vírgulas"><Input id="p-areas" value={v.areas} onChange={set('areas')} /></FormField>
          <FormField id="p-bio" label="Bio"><Textarea id="p-bio" rows={4} value={v.bio} onChange={set('bio')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="p-li" label="LinkedIn"><Input id="p-li" type="url" value={v.linkedin} onChange={set('linkedin')} /></FormField>
            <FormField id="p-site" label="Site"><Input id="p-site" type="url" value={v.site} onChange={set('site')} /></FormField>
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
