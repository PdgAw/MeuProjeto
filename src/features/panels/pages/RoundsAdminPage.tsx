import { CalendarClock, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { usePermission } from '@/features/auth/hooks/useAuth'
import { useRounds } from '../api'
import { ROUND_STATUS } from '../components/labels'
import { RoundFormDialog } from '../components/RoundFormDialog'

export default function RoundsAdminPage() {
  const { data, isPending } = useRounds()
  const canManage = usePermission('panels.manage')
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Bancas</h1><p className="mt-1 text-muted-foreground">Rodadas de avaliação de projetos e Venture Capital.</p></div>
        <div className="flex gap-2"><Button variant="outline" asChild><Link to="/avaliacoes">Minhas avaliações</Link></Button>{canManage && <Button onClick={() => setCreating(true)}><Plus /> Nova banca</Button>}</div>
      </header>
      {isPending ? <CardSkeleton lines={3} /> : !data?.length ? <EmptyState text="Nenhuma banca criada." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((r) => {
            const sent = r.pitch_submissions.filter((s) => s.status !== 'draft').length
            return (
              <Link key={r.id} to={`/gestao/bancas/${r.id}`}>
                <Card className="h-full space-y-3 p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2"><p className="font-display text-lg font-semibold">{r.name}</p><Badge variant={r.status === 'open' ? 'default' : 'secondary'}>{ROUND_STATUS[r.status]}</Badge></div>
                  {r.panel_date && <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="h-4 w-4" />{format(new Date(r.panel_date), "dd 'de' MMM yyyy", { locale: ptBR })}</p>}
                  <p className="text-sm">{sent} pitch{sent === 1 ? '' : 'es'} submetido{sent === 1 ? '' : 's'} · {r.panel_criteria.length} critérios</p>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
      <RoundFormDialog open={creating} onOpenChange={setCreating} onSaved={(id) => navigate(`/gestao/bancas/${id}`)} />
    </div>
  )
}
