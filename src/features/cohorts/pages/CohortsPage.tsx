import { CalendarRange, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { usePermission } from '@/features/auth/hooks/useAuth'
import { fmtDate, parseLocalDate } from '@/lib/format'
import { useCohortList } from '../api'
import { CohortFormDialog } from '../components/CohortFormDialog'

const STATUS = { planned: ['Planejada', 'outline'], active: ['Ativa', 'default'], completed: ['Concluída', 'success'], archived: ['Arquivada', 'secondary'] } as const

export default function CohortsPage() {
  const { data, isPending } = useCohortList()
  const canCreate = usePermission('classes.create')
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Turmas</h1><p className="mt-1 text-muted-foreground">Coortes de Neoleaders e seus indicadores.</p></div>
        {canCreate && <Button onClick={() => setCreating(true)}><Plus /> Nova turma</Button>}
      </header>
      {isPending ? <CardSkeleton lines={3} /> : !data?.length ? <EmptyState text="Nenhuma turma cadastrada." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => {
            const [label, variant] = STATUS[c.status]
            return (
              <Link key={c.id} to={`/gestao/turmas/${c.id}`}>
                <Card className="h-full space-y-3 p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-display text-lg font-semibold">{c.name}</p>{c.code && <p className="font-mono text-xs text-muted-foreground">{c.code}</p>}</div>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarRange className="h-4 w-4" />
                    {c.starts_on ? fmtDate(parseLocalDate(c.starts_on)) : '—'} → {c.ends_on ? fmtDate(parseLocalDate(c.ends_on)) : '—'}</p>
                  <div>
                    <p className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{c.active} Neoleaders</span>
                      {c.capacity && <span className="text-xs text-muted-foreground">{c.capacity} vagas</span>}</p>
                    {c.capacity && <Progress value={(100 * c.active) / c.capacity} className="h-1.5" />}
                  </div>
                  {c.coordinator && <p className="text-xs text-muted-foreground">Coordenação: {c.coordinator.full_name}</p>}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
      <CohortFormDialog open={creating} onOpenChange={setCreating} onSaved={(id) => navigate(`/gestao/turmas/${id}`)} />
    </div>
  )
}
