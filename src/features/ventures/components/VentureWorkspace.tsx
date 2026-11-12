import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fmtRelative } from '@/lib/format'
import { initials } from '@/lib/utils'
import type { VentureDetail } from '../api'
import { ExecutionPlan } from './ExecutionPlan'
import { FamilyBusinessCard } from './FamilyBusinessCard'
import { KpiDashboard } from './KpiDashboard'
import { MilestonesPanel } from './MilestonesPanel'
import { OverviewTab } from './OverviewTab'
import { StageStepper } from './StageStepper'
import { VentureFormDialog } from './VentureFormDialog'

interface Props { venture: VentureDetail; editable: boolean; isOwner: boolean; track: 'founder' | 'successor' | 'other' | null }

export function VentureWorkspace({ venture: v, editable, isOwner, track }: Props) {
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const tab = params.get('aba') ?? 'visao-geral'
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-sidebar font-display text-xl font-semibold text-accent">
            {v.logo_url ? <img src={v.logo_url} alt="" className="h-full w-full object-cover" /> : initials(v.name)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{v.name}</h1>
            {v.tagline && <p className="text-muted-foreground">{v.tagline}</p>}
            <div className="mt-1 flex flex-wrap gap-1.5">
              {!isOwner && v.owner && <Badge variant="secondary">{v.owner.full_name}</Badge>}
              {v.segment && <Badge variant="outline">{v.segment}</Badge>}
              <span className="text-xs text-muted-foreground">Atualizado {fmtRelative(v.last_update_at)}</span>
            </div>
          </div>
        </div>
        {editable && <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Editar negócio</Button>}
      </header>
      <StageStepper venture={v} editable={editable} />
      <Tabs value={tab} onValueChange={(t) => setParams({ aba: t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="dashboard">Business Dashboard</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="plano">Plano de Execução</TabsTrigger>
          {track === 'successor' && <TabsTrigger value="empresa-familiar">Empresa familiar</TabsTrigger>}
        </TabsList>
        <TabsContent value="visao-geral"><OverviewTab venture={v} editable={editable} /></TabsContent>
        <TabsContent value="dashboard"><KpiDashboard venture={v} editable={editable} /></TabsContent>
        <TabsContent value="milestones"><MilestonesPanel venture={v} editable={editable} track={track} /></TabsContent>
        <TabsContent value="plano"><ExecutionPlan venture={v} editable={editable} /></TabsContent>
        {track === 'successor' && <TabsContent value="empresa-familiar"><FamilyBusinessCard ownerId={v.owner_id} editable={isOwner} /></TabsContent>}
      </Tabs>
      <VentureFormDialog open={editing} onOpenChange={setEditing} ownerId={v.owner_id} venture={v} />
    </div>
  )
}
