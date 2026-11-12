import { zodResolver } from '@hookform/resolvers/zod'
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
import { useCohorts, usePeopleWithRole, useSaveSubject, type SubjectDetail } from '../api'

const DIMENSIONS = [
  ['learning', 'Aprendizado'], ['execution', 'Execução'], ['mentoring', 'Mentorias'], ['participation', 'Participação'],
  ['venture', 'Projeto empresarial'], ['experiences', 'Experiências'], ['goals', 'Metas'],
] as const

const schema = z.object({
  code: z.string().trim().min(2, 'Informe o código.').max(20),
  name: z.string().trim().min(3, 'Informe o nome.'),
  description: z.string().optional(),
  workload_hours: z.string().optional(),
  period_label: z.string().optional(),
  starts_on: z.string().optional(),
  ends_on: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  dimensions: z.array(z.string()).min(1, 'Escolha ao menos uma dimensão.'),
  teacherIds: z.array(z.string()),
  cohortIds: z.array(z.string()),
})
type Values = z.infer<typeof schema>

interface Props { open: boolean; onOpenChange: (o: boolean) => void; subject?: SubjectDetail | null; onSaved?: (id: string) => void }

export function SubjectFormDialog({ open, onOpenChange, subject, onSaved }: Props) {
  const teachers = usePeopleWithRole('teacher')
  const cohorts = useCohorts()
  const save = useSaveSubject()
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  const { errors } = form.formState

  useEffect(() => {
    if (!open) return
    form.reset({
      code: subject?.code ?? '', name: subject?.name ?? '', description: subject?.description ?? '',
      workload_hours: subject?.workload_hours?.toString() ?? '', period_label: subject?.period_label ?? '',
      starts_on: subject?.starts_on ?? '', ends_on: subject?.ends_on ?? '', status: subject?.status ?? 'active',
      dimensions: subject?.dimensions ?? ['learning'],
      teacherIds: subject?.subject_teachers.sort((a) => (a.role === 'lead' ? -1 : 1)).map((t) => t.teacher?.id).filter(Boolean) as string[] ?? [],
      cohortIds: subject?.subject_cohorts.map((c) => c.cohort?.id).filter(Boolean) as string[] ?? [],
    })
  }, [open, subject, form])

  const toggle = (field: 'dimensions' | 'teacherIds' | 'cohortIds', value: string) => {
    const cur = form.getValues(field)
    form.setValue(field, cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value], { shouldValidate: true })
  }
  const watch = form.watch()

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const id = await save.mutateAsync({
        id: subject?.id, code: v.code.toUpperCase(), name: v.name, description: v.description || null,
        workload_hours: v.workload_hours ? Number(v.workload_hours) : null, period_label: v.period_label || null,
        starts_on: v.starts_on || null, ends_on: v.ends_on || null, status: v.status,
        dimensions: v.dimensions as SubjectDetail['dimensions'], teacherIds: v.teacherIds, cohortIds: v.cohortIds,
      })
      toast.success(subject ? 'Disciplina atualizada.' : 'Disciplina criada.')
      onOpenChange(false)
      onSaved?.(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  })

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={subject ? 'Editar disciplina' : 'Nova disciplina'} className="sm:max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <FormField id="code" label="Código" error={errors.code?.message}><Input id="code" className="uppercase" {...form.register('code')} /></FormField>
            <FormField id="name" label="Nome" error={errors.name?.message}><Input id="name" {...form.register('name')} /></FormField>
          </div>
          <FormField id="description" label="Descrição"><Textarea id="description" rows={3} {...form.register('description')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="workload_hours" label="Carga horária (h)"><Input id="workload_hours" type="number" min={0} {...form.register('workload_hours')} /></FormField>
            <FormField id="period_label" label="Período"><Input id="period_label" placeholder="2026 · Ciclo 2" {...form.register('period_label')} /></FormField>
            <FormField id="status" label="Status">
              <Select id="status" {...form.register('status')}>
                <option value="draft">Rascunho</option><option value="active">Em andamento</option>
                <option value="completed">Concluída</option><option value="archived">Arquivada</option>
              </Select>
            </FormField>
            <FormField id="starts_on" label="Início"><Input id="starts_on" type="date" {...form.register('starts_on')} /></FormField>
            <FormField id="ends_on" label="Término"><Input id="ends_on" type="date" {...form.register('ends_on')} /></FormField>
          </div>
          <FormField id="dimensions" label="Contribui para (Neo Progress)" error={errors.dimensions?.message}>
            <div className="flex flex-wrap gap-2">
              {DIMENSIONS.map(([k, l]) => (
                <button type="button" key={k} className={chip(watch.dimensions?.includes(k))} onClick={() => toggle('dimensions', k)}>{l}</button>
              ))}
            </div>
          </FormField>
          <FormField id="teachers" label="Professores (o primeiro é o responsável)">
            <div className="flex flex-wrap gap-2">
              {teachers.data?.length ? teachers.data.map((t) => (
                <button type="button" key={t.id} className={chip(watch.teacherIds?.includes(t.id))} onClick={() => toggle('teacherIds', t.id)}>{t.full_name}</button>
              )) : <p className="text-xs text-muted-foreground">Nenhum professor cadastrado ainda.</p>}
            </div>
          </FormField>
          <FormField id="cohorts" label="Turmas">
            <div className="flex flex-wrap gap-2">
              {cohorts.data?.length ? cohorts.data.map((c) => (
                <button type="button" key={c.id} className={chip(watch.cohortIds?.includes(c.id))} onClick={() => toggle('cohortIds', c.id)}>{c.name}</button>
              )) : <p className="text-xs text-muted-foreground">Nenhuma turma cadastrada ainda.</p>}
            </div>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
