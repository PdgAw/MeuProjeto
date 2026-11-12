import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { DashboardKey } from '@/features/auth/types'
import { firstName, greeting } from '@/lib/utils'

const TITLES: Record<DashboardKey, string> = {
  neoleader: 'Veja o que está acontecendo na sua jornada NeoLevel.',
  coordination: 'Visão geral da coordenação.',
  direction: 'Visão executiva da NeoLevel.',
  teacher: 'Suas aulas e turmas.',
  mentor: 'Seus Neoleaders e próximas mentorias.',
  secretary: 'Cadastros, matrículas e solicitações.',
  staff: 'Operações da NeoLevel.',
}

/** Phase 2 placeholder proving role-based redirect; real dashboards arrive in Phase 3+. */
export default function RoleHomePage({ dashboard }: { dashboard: DashboardKey }) {
  const { user } = useAuth()
  if (!user) return null
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {greeting()}, {firstName(user.preferred_name || user.full_name)}.
        </h1>
        <p className="mt-1 text-muted-foreground">{TITLES[dashboard]}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Acesso configurado</CardTitle>
          <CardDescription>Seu perfil e permissões foram carregados do banco de dados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            {user.roles.map((r) => <Badge key={r.key}>{r.name}</Badge>)}
            {user.cohort && <Badge variant="secondary">{user.cohort.name}</Badge>}
          </div>
          <div>
            <p className="mb-2 font-medium">Permissões ({user.permissions.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {user.permissions.map((p) => <Badge key={p} variant="outline" className="font-mono text-[11px]">{p}</Badge>)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
