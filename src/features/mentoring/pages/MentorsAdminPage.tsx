import { Link2, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { usePermission } from '@/features/auth/hooks/useAuth'
import { initials } from '@/lib/utils'
import { useAssignMentor, useEndMentorAssignment, useMentorsOverview, useNeoleaderOptions } from '../api'

/** Management: Neomentores, their mentees, and linking Neoleaders to mentors. */
export default function MentorsAdminPage() {
  const { data, isPending } = useMentorsOverview()
  const canManage = usePermission('mentoring.manage')
  const end = useEndMentorAssignment()
  const [assigning, setAssigning] = useState<string | null | undefined>(undefined)
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Neomentores</h1><p className="mt-1 text-muted-foreground">Quem mentora quem — e o foco de cada vínculo.</p></div>
        {canManage && <Button onClick={() => setAssigning(null)}><Link2 /> Vincular Neoleader</Button>}
      </header>
      {isPending ? <CardSkeleton lines={3} /> : !data?.length ? <EmptyState text="Nenhum Neomentor cadastrado. Convide Neomentores em Usuários." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((m) => (
            <Card key={m.id} className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">{m.avatar_url && <AvatarImage src={m.avatar_url} alt="" />}<AvatarFallback>{initials(m.full_name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><Link to={`/professores/${m.id}`} className="font-semibold hover:underline">{m.full_name}</Link>
                  <p className="truncate text-sm text-muted-foreground">{m.professional_profiles?.company ?? m.job_title}</p></div>
                <Badge variant="secondary">{m.mentees.length} mentorados</Badge>
              </div>
              <ul className="space-y-2">
                {m.mentees.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                    <span className="flex-1"><span className="font-medium">{l.student?.full_name}</span>{l.focus && <span className="text-muted-foreground"> · {l.focus}</span>}</span>
                    {canManage && <button aria-label="Encerrar vínculo" onClick={() => { if (confirm(`Encerrar o vínculo com ${l.student?.full_name}? O histórico é mantido.`)) end.mutate(l.id, { onSuccess: () => toast.success('Vínculo encerrado.') }) }}><X className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>}
                  </li>
                ))}
                {!m.mentees.length && <li className="text-sm text-muted-foreground">Sem mentorados.</li>}
              </ul>
              {canManage && <Button size="sm" variant="outline" onClick={() => setAssigning(m.id)}><Plus /> Vincular a este Neomentor</Button>}
            </Card>
          ))}
        </div>
      )}
      {assigning !== undefined && <AssignDialog mentors={(data ?? []).map((m) => ({ id: m.id, name: m.full_name }))} defaultMentor={assigning} onClose={() => setAssigning(undefined)} />}
    </div>
  )
}

function AssignDialog({ mentors, defaultMentor, onClose }: { mentors: { id: string; name: string }[]; defaultMentor: string | null; onClose: () => void }) {
  const students = useNeoleaderOptions()
  const assign = useAssignMentor()
  const [mentorId, setMentorId] = useState(defaultMentor ?? mentors[0]?.id ?? '')
  const [studentId, setStudentId] = useState('')
  const [focus, setFocus] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Vincular Neoleader a Neomentor" description="Um Neoleader pode ter mais de um Neomentor.">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          if (!mentorId || !studentId) return toast.error('Escolha o Neomentor e o Neoleader.')
          assign.mutate({ mentorId, studentId, focus }, { onSuccess: () => { toast.success('Vínculo criado.'); onClose() }, onError: (er) => toast.error(er.message) })
        }}>
          <FormField id="as-m" label="Neomentor"><Select id="as-m" value={mentorId} onChange={(e) => setMentorId(e.target.value)}>{mentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></FormField>
          <FormField id="as-s" label="Neoleader">
            <Select id="as-s" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Selecione…</option>{students.data?.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.cohort}</option>)}
            </Select>
          </FormField>
          <FormField id="as-f" label="Foco da mentoria"><Input id="as-f" placeholder="Go-to-market e primeiras vendas" value={focus} onChange={(e) => setFocus(e.target.value)} /></FormField>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={assign.isPending}>Vincular</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
