import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { LESSON_TYPE_LABEL } from '@/config/labels'
import { useSaveLesson, type LessonRow } from '../api'

const schema = z.object({
  title: z.string().trim().min(3, 'Informe o título.'),
  description: z.string().optional(),
  cohort_id: z.string().min(1, 'Escolha a turma.'),
  date: z.string().min(1, 'Informe a data.'),
  start: z.string().min(1, 'Início?'),
  end: z.string().min(1, 'Término?'),
  lesson_type: z.enum(['class', 'workshop', 'masterclass', 'case', 'lab', 'dynamic', 'practical']),
  modality: z.enum(['in_person', 'online', 'hybrid']),
  location: z.string().optional(),
  room: z.string().optional(),
  online_provider: z.string().optional(),
  meeting_url: z.string().url('Link inválido.').optional().or(z.literal('')),
  guest_name: z.string().optional(),
  guest_title: z.string().optional(),
}).refine((v) => v.end > v.start, { path: ['end'], message: 'Término deve ser depois do início.' })
  .refine((v) => v.modality === 'in_person' || Boolean(v.meeting_url), { path: ['meeting_url'], message: 'Informe o link da aula online.' })
type Values = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  subjectId: string
  cohorts: { id: string; name: string }[]
  teacherId?: string | null
  lesson?: LessonRow | null
}

export function LessonFormDialog({ open, onOpenChange, subjectId, cohorts, teacherId, lesson }: Props) {
  const save = useSaveLesson()
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  const { errors } = form.formState
  const modality = form.watch('modality')

  useEffect(() => {
    if (!open) return
    const s = lesson ? new Date(lesson.starts_at) : null
    const e = lesson ? new Date(lesson.ends_at) : null
    form.reset({
      title: lesson?.title ?? '', description: lesson?.description ?? '', cohort_id: lesson?.cohort_id ?? cohorts[0]?.id ?? '',
      date: s ? format(s, 'yyyy-MM-dd') : '', start: s ? format(s, 'HH:mm') : '19:00', end: e ? format(e, 'HH:mm') : '22:00',
      lesson_type: lesson?.lesson_type ?? 'class', modality: lesson?.modality ?? 'in_person',
      location: lesson?.location ?? 'Academia FIESC', room: lesson?.room ?? '', online_provider: lesson?.online_provider ?? 'meet',
      meeting_url: lesson?.meeting_url ?? '', guest_name: lesson?.guest_name ?? '', guest_title: lesson?.guest_title ?? '',
    })
  }, [open, lesson, cohorts, form])

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        id: lesson?.id, subject_id: subjectId, cohort_id: v.cohort_id, title: v.title, description: v.description || null,
        starts_at: new Date(`${v.date}T${v.start}`).toISOString(), ends_at: new Date(`${v.date}T${v.end}`).toISOString(),
        lesson_type: v.lesson_type, modality: v.modality,
        location: v.modality === 'online' ? null : v.location || null, room: v.modality === 'online' ? null : v.room || null,
        online_provider: v.modality === 'in_person' ? null : (v.online_provider as LessonRow['online_provider']) || 'other',
        meeting_url: v.modality === 'in_person' ? null : v.meeting_url || null,
        guest_name: v.guest_name || null, guest_title: v.guest_title || null,
        teacher_id: lesson?.teacher_id ?? teacherId ?? null,
      })
      toast.success(lesson ? 'Aula atualizada. Os Neoleaders foram notificados.' : 'Aula criada. Os Neoleaders foram notificados.')
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={lesson ? 'Editar aula' : 'Nova aula'} className="sm:max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField id="title" label="Título" error={errors.title?.message}><Input id="title" {...form.register('title')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="cohort_id" label="Turma" error={errors.cohort_id?.message}>
              <Select id="cohort_id" {...form.register('cohort_id')}>{cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            </FormField>
            <FormField id="lesson_type" label="Tipo">
              <Select id="lesson_type" {...form.register('lesson_type')}>
                {Object.entries(LESSON_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField id="date" label="Data" error={errors.date?.message}><Input id="date" type="date" {...form.register('date')} /></FormField>
            <FormField id="start" label="Início" error={errors.start?.message}><Input id="start" type="time" {...form.register('start')} /></FormField>
            <FormField id="end" label="Término" error={errors.end?.message}><Input id="end" type="time" {...form.register('end')} /></FormField>
          </div>
          <FormField id="modality" label="Modalidade">
            <Select id="modality" {...form.register('modality')}>
              <option value="in_person">Presencial</option><option value="online">Online</option><option value="hybrid">Híbrida</option>
            </Select>
          </FormField>
          {modality !== 'online' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="location" label="Local"><Input id="location" {...form.register('location')} /></FormField>
              <FormField id="room" label="Sala"><Input id="room" placeholder="Sala 02" {...form.register('room')} /></FormField>
            </div>
          )}
          {modality !== 'in_person' && (
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <FormField id="online_provider" label="Plataforma">
                <Select id="online_provider" {...form.register('online_provider')}>
                  <option value="meet">Google Meet</option><option value="zoom">Zoom</option><option value="teams">Teams</option><option value="other">Outro link</option>
                </Select>
              </FormField>
              <FormField id="meeting_url" label="Link" error={errors.meeting_url?.message}><Input id="meeting_url" type="url" {...form.register('meeting_url')} /></FormField>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="guest_name" label="Convidado (opcional)"><Input id="guest_name" {...form.register('guest_name')} /></FormField>
            <FormField id="guest_title" label="Cargo do convidado"><Input id="guest_title" {...form.register('guest_title')} /></FormField>
          </div>
          <FormField id="description" label="Descrição / preparação"><Textarea id="description" rows={3} {...form.register('description')} /></FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}Salvar aula</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
