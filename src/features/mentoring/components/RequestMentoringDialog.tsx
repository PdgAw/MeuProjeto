import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRequestMentoring } from '../api'

export function RequestMentoringDialog({ open, onOpenChange, mentors, defaultMentorId }: {
  open: boolean; onOpenChange: (o: boolean) => void; mentors: { id: string; full_name: string }[]; defaultMentorId?: string
}) {
  const req = useRequestMentoring()
  const [mentorId, setMentorId] = useState(defaultMentorId ?? mentors[0]?.id ?? '')
  const [when, setWhen] = useState('')
  const [topics, setTopics] = useState('')
  const [note, setNote] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentorId) return toast.error('Escolha o Neomentor.')
    if (!note.trim()) return toast.error('Conte o que você quer trabalhar na mentoria.')
    try {
      await req.mutateAsync({ mentorId, preferredAt: when ? new Date(when).toISOString() : null, topics: topics.split(',').map((t) => t.trim()).filter(Boolean), note: note.trim() })
      toast.success('Solicitação enviada. Seu Neomentor foi notificado.')
      setNote(''); setTopics(''); setWhen('')
      onOpenChange(false)
    } catch (err) { toast.error(err instanceof Error ? err.message : String(err)) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Solicitar mentoria" description="Seu Neomentor confirma o horário e a sessão aparece na sua agenda.">
        <form onSubmit={submit} className="space-y-4">
          <FormField id="r-mentor" label="Neomentor">
            <Select id="r-mentor" value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
              {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </Select>
          </FormField>
          <FormField id="r-note" label="O que você quer trabalhar?"><Textarea id="r-note" rows={4} placeholder="Ex.: preciso validar meu modelo de preço antes de visitar novos clientes." value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
          <FormField id="r-topics" label="Assuntos" hint="Separe por vírgulas"><Input id="r-topics" placeholder="Pricing, Vendas" value={topics} onChange={(e) => setTopics(e.target.value)} /></FormField>
          <FormField id="r-when" label="Sugestão de horário (opcional)"><Input id="r-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={req.isPending}>{req.isPending && <Loader2 className="animate-spin" />}Enviar solicitação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
