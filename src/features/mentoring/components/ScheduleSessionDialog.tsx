import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useScheduleSession, type Session } from '../api'

/** Mentor schedules a new session, or confirms/reschedules an existing one. */
export function ScheduleSessionDialog({ open, onOpenChange, mentorId, mentees, session }: {
  open: boolean; onOpenChange: (o: boolean) => void; mentorId: string; mentees: { id: string; name: string }[]; session?: Session | null
}) {
  const save = useScheduleSession()
  const [v, setV] = useState({ studentId: '', when: '', duration: '60', modality: 'online', location: '', url: '', topics: '' })
  useEffect(() => {
    if (open) setV({
      studentId: session?.student_id ?? mentees[0]?.id ?? '',
      when: session?.scheduled_at ? format(new Date(session.scheduled_at), "yyyy-MM-dd'T'HH:mm") : '',
      duration: String(session?.duration_min ?? 60), modality: session?.modality ?? 'online',
      location: session?.location ?? '', url: session?.meeting_url ?? '', topics: session?.topics.join(', ') ?? '',
    })
  }, [open, session, mentees])
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!v.studentId || !v.when) return toast.error('Escolha o Neoleader e o horário.')
    if (v.modality !== 'in_person' && v.url && !/^https?:\/\//.test(v.url)) return toast.error('Link inválido.')
    try {
      await save.mutateAsync({
        id: session?.id, mentorId, studentId: v.studentId, scheduledAt: new Date(v.when).toISOString(), durationMin: Number(v.duration),
        modality: v.modality as Session['modality'], location: v.modality === 'online' ? null : v.location || null,
        meetingUrl: v.modality === 'in_person' ? null : v.url || null, topics: v.topics.split(',').map((t) => t.trim()).filter(Boolean),
      })
      toast.success(session?.status === 'requested' ? 'Mentoria confirmada. O Neoleader foi notificado.' : 'Mentoria agendada. O Neoleader foi notificado.')
      onOpenChange(false)
    } catch (err) { toast.error(err instanceof Error ? err.message : String(err)) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={session?.status === 'requested' ? 'Confirmar mentoria' : session ? 'Reagendar mentoria' : 'Agendar mentoria'}>
        <form onSubmit={submit} className="space-y-4">
          <FormField id="s-student" label="Neoleader">
            <Select id="s-student" value={v.studentId} onChange={set('studentId')} disabled={Boolean(session)}>
              {mentees.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <FormField id="s-when" label="Data e hora"><Input id="s-when" type="datetime-local" value={v.when} onChange={set('when')} /></FormField>
            <FormField id="s-dur" label="Duração">
              <Select id="s-dur" value={v.duration} onChange={set('duration')}>{[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</Select>
            </FormField>
          </div>
          <FormField id="s-mod" label="Modalidade">
            <Select id="s-mod" value={v.modality} onChange={set('modality')}><option value="online">Online</option><option value="in_person">Presencial</option><option value="hybrid">Híbrida</option></Select>
          </FormField>
          {v.modality !== 'online' && <FormField id="s-loc" label="Local"><Input id="s-loc" value={v.location} onChange={set('location')} /></FormField>}
          {v.modality !== 'in_person' && <FormField id="s-url" label="Link (Meet, Zoom, Teams)"><Input id="s-url" type="url" value={v.url} onChange={set('url')} /></FormField>}
          <FormField id="s-topics" label="Assuntos" hint="Separe por vírgulas"><Input id="s-topics" value={v.topics} onChange={set('topics')} /></FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
