import { ArrowLeft, Archive, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSetSubjectStatus, useSubject, useSubjectLessons } from '../api'
import { SubjectFormDialog } from '../components/SubjectFormDialog'
import { AnnouncementsTab } from '../components/subject/AnnouncementsTab'
import { AssignmentsTab } from '../components/subject/AssignmentsTab'
import { LessonsTab } from '../components/subject/LessonsTab'
import { MaterialsTab } from '../components/subject/MaterialsTab'
import { OverviewTab } from '../components/subject/OverviewTab'
import { ParticipantsTab } from '../components/subject/ParticipantsTab'
import { ResultsTab } from '../components/subject/ResultsTab'

const TABS = [
  ['visao-geral', 'Visão geral'], ['cronograma', 'Cronograma'], ['aulas', 'Aulas'], ['materiais', 'Materiais'],
  ['entregas', 'Entregas'], ['participantes', 'Participantes'], ['comunicados', 'Comunicados'], ['resultados', 'Resultados'],
] as const

export default function SubjectDetailPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { user, hasPermission } = useAuth()
  const { data: s, isPending } = useSubject(id)
  const lessons = useSubjectLessons(id)
  const setStatus = useSetSubjectStatus()
  const [editing, setEditing] = useState(false)
  if (!user) return null
  if (isPending) return <CardSkeleton lines={4} />
  if (!s) return <p className="text-muted-foreground">Disciplina não encontrada ou sem acesso.</p>

  const canManage = hasPermission('subjects.manage')
  const isTeacher = s.subject_teachers.some((t) => t.teacher?.id === user.user_id)
  const canTeach = canManage || isTeacher
  const staffView = canTeach || hasPermission('classes.view')
  const isStudent = !staffView
  const cohorts = s.subject_cohorts.map((c) => c.cohort).filter((c): c is { id: string; name: string } => Boolean(c))
  const tab = params.get('aba') ?? 'visao-geral'
  const lessonOptions = (lessons.data ?? []).map((l) => ({ id: l.id, title: l.title }))

  return (
    <div className="space-y-6">
      <Link to="/disciplinas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Disciplinas</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold tracking-wider text-primary">{s.code}</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{s.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {isTeacher && <Badge>Você leciona</Badge>}
            {s.status === 'archived' && <Badge variant="secondary">Arquivada</Badge>}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Editar</Button>
            {s.status !== 'archived' && (
              <Button variant="ghost" onClick={() => {
                if (confirm('Arquivar esta disciplina? Ela sai do catálogo, mas o histórico é mantido.'))
                  setStatus.mutate({ id: s.id, status: 'archived' }, { onSuccess: () => toast.success('Disciplina arquivada.') })
              }}><Archive /> Arquivar</Button>
            )}
          </div>
        )}
      </header>

      <Tabs value={tab} onValueChange={(v) => setParams({ aba: v }, { replace: true })}>
        <TabsList className="w-full justify-start sm:w-auto">
          {TABS.map(([k, l]) => <TabsTrigger key={k} value={k}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="visao-geral"><OverviewTab subject={s} cohortId={isStudent ? user.cohort?.id : null} /></TabsContent>
        <TabsContent value="cronograma"><LessonsTab variant="schedule" subjectId={s.id} userId={user.user_id} canTeach={canTeach} isStudent={isStudent} cohortId={user.cohort?.id} cohorts={cohorts} /></TabsContent>
        <TabsContent value="aulas"><LessonsTab variant="lessons" subjectId={s.id} userId={user.user_id} canTeach={canTeach} isStudent={isStudent} cohortId={user.cohort?.id} cohorts={cohorts} /></TabsContent>
        <TabsContent value="materiais"><MaterialsTab subjectId={s.id} canTeach={canTeach} lessons={lessonOptions} /></TabsContent>
        <TabsContent value="entregas"><AssignmentsTab subjectId={s.id} userId={user.user_id} canTeach={canTeach} cohorts={cohorts} /></TabsContent>
        <TabsContent value="participantes"><ParticipantsTab subject={s} canSeeRoster={staffView} /></TabsContent>
        <TabsContent value="comunicados"><AnnouncementsTab subjectId={s.id} /></TabsContent>
        <TabsContent value="resultados"><ResultsTab subjectId={s.id} userId={user.user_id} teacherView={staffView} cohortId={user.cohort?.id} /></TabsContent>
      </Tabs>
      <SubjectFormDialog open={editing} onOpenChange={setEditing} subject={s} />
    </div>
  )
}
