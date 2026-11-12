import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useSubjects } from '../api'
import { SubjectCard } from '../components/SubjectCard'
import { SubjectFormDialog } from '../components/SubjectFormDialog'

type Filter = 'mine' | 'all' | 'archived'

/** Catalog: Neoleader sees the cohort's subjects, teachers their own, management everything. */
export default function SubjectsPage() {
  const { user, hasPermission } = useAuth()
  const navigate = useNavigate()
  const canManage = hasPermission('subjects.manage')
  const seesAll = canManage || hasPermission('classes.view')
  const [filter, setFilter] = useState<Filter>(seesAll ? 'all' : 'mine')
  const [creating, setCreating] = useState(false)
  const { data, isPending } = useSubjects({ includeArchived: filter === 'archived' })
  if (!user) return null

  const mine = (data ?? []).filter((s) =>
    s.subject_teachers.some((t) => t.teacher?.id === user.user_id) ||
    (user.cohort && s.subject_cohorts.some((c) => c.cohort?.id === user.cohort?.id)),
  )
  const list = filter === 'mine' ? mine : filter === 'archived' ? (data ?? []).filter((s) => s.status === 'archived') : (data ?? [])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Disciplinas</h1>
          <p className="mt-1 text-muted-foreground">
            {user.dashboard === 'neoleader' ? 'As disciplinas da sua turma e o seu progresso em cada uma.' : 'Estrutura acadêmica da NeoLevel.'}
          </p>
        </div>
        {canManage && <Button onClick={() => setCreating(true)}><Plus /> Nova disciplina</Button>}
      </header>

      {seesAll && (
        <div className="flex gap-2">
          {(['all', 'mine', 'archived'] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', filter === f ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}>
              {{ all: 'Todas', mine: 'Minhas', archived: 'Arquivadas' }[f]}
            </button>
          ))}
        </div>
      )}

      {isPending ? <CardSkeleton lines={3} /> : list.length === 0 ? (
        <EmptyState text={filter === 'mine' ? 'Nenhuma disciplina vinculada a você ainda.' : 'Nenhuma disciplina encontrada.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => <SubjectCard key={s.id} subject={s} cohortId={user.dashboard === 'neoleader' ? user.cohort?.id : null} />)}
        </div>
      )}
      <SubjectFormDialog open={creating} onOpenChange={setCreating} onSaved={(id) => navigate(`/disciplinas/${id}`)} />
    </div>
  )
}
