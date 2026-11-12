import { Briefcase, Building2, Rocket } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { usePrimaryVenture, useVenture } from '../api'
import { FamilyBusinessCard } from '../components/FamilyBusinessCard'
import { VentureFormDialog } from '../components/VentureFormDialog'
import { VentureWorkspace } from '../components/VentureWorkspace'

/** "Meu Negócio" — the Neoleader's main project (and family company for successors). */
export default function MyVenturePage() {
  const { user } = useAuth()
  const primary = usePrimaryVenture(user?.user_id)
  const detail = useVenture(primary.data?.id)
  const [creating, setCreating] = useState(false)
  if (!user) return null
  if (primary.isPending || (primary.data && detail.isPending)) return <CardSkeleton lines={5} />

  if (!primary.data) {
    const successor = user.track === 'successor'
    return (
      <div className="space-y-6">
        <header><h1 className="text-2xl font-semibold sm:text-3xl">Meu Negócio</h1>
          <p className="mt-1 text-muted-foreground">{successor ? 'A empresa da sua família e os projetos que você lidera nela.' : 'Seu projeto empresarial: do problema à escala, com indicadores e plano de execução.'}</p></header>
        {successor && <FamilyBusinessCard ownerId={user.user_id} editable />}
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">{successor ? <Building2 /> : <Rocket />}</span>
            <div className="max-w-md space-y-1">
              <p className="font-display text-lg font-semibold">{successor ? 'Tem um projeto próprio ou dentro da empresa?' : 'Cadastre seu negócio'}</p>
              <p className="text-sm text-muted-foreground">Acompanhe estágio, KPIs, milestones e o Plano de Execução, com os comentários dos seus Neomentores.</p>
            </div>
            <Button onClick={() => setCreating(true)}><Briefcase /> Cadastrar projeto</Button>
          </CardContent>
        </Card>
        <VentureFormDialog open={creating} onOpenChange={setCreating} ownerId={user.user_id} />
      </div>
    )
  }
  if (!detail.data) return <p className="text-muted-foreground">Não foi possível carregar o negócio.</p>
  return <VentureWorkspace venture={detail.data} editable isOwner track={user.track} />
}
