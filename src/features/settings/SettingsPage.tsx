import { Lock, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { TRACK_LABEL, VENTURE_STAGES } from '@/config/labels'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { MODULE_LABEL, useRbac, useToggleRolePermission } from '@/features/users/api'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'
import { useSaveRow, useSettingsData } from './api'

type Enums = Database['public']['Enums']
const onErr = (e: Error) => toast.error(e.message)
const ok = () => toast.success('Salvo.')

export default function SettingsPage() {
  const { hasPermission } = useAuth()
  const settings = hasPermission('settings.manage')
  const perms = hasPermission('permissions.manage')
  const [tab, setTab] = useState(settings ? 'progresso' : 'permissoes')
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Configurações</h1><p className="mt-1 text-muted-foreground">Regras da jornada, catálogos e permissões da plataforma.</p></header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          {settings && <><TabsTrigger value="progresso">Neo Progress</TabsTrigger><TabsTrigger value="checkpoints">Checkpoints das trilhas</TabsTrigger><TabsTrigger value="milestones">Milestones</TabsTrigger><TabsTrigger value="kpis">KPIs</TabsTrigger></>}
          {(perms || hasPermission('users.view')) && <TabsTrigger value="permissoes">Cargos e permissões</TabsTrigger>}
        </TabsList>
        {settings && <><TabsContent value="progresso"><Progress /></TabsContent><TabsContent value="checkpoints"><Checkpoints /></TabsContent>
          <TabsContent value="milestones"><Milestones /></TabsContent><TabsContent value="kpis"><Kpis /></TabsContent></>}
        <TabsContent value="permissoes"><Matrix editable={perms} /></TabsContent>
      </Tabs>
    </div>
  )
}

function Progress() {
  const { data, isPending } = useSettingsData()
  const save = useSaveRow('progress_dimension_settings')
  const [draft, setDraft] = useState<Record<string, string>>({})
  if (isPending || !data) return <CardSkeleton />
  const enabled = data.dims.filter((d) => d.is_enabled)
  const total = enabled.reduce((s, d) => s + Number(draft[d.dimension] ?? d.weight), 0)
  return (
    <SectionCard title="Dimensões e pesos do Neo Progress">
      <p className="mb-4 text-sm text-muted-foreground">O Neo Progress combina as dimensões ativas pela média ponderada. Os pesos são relativos — não precisam somar 100.</p>
      <ul className="divide-y rounded-lg border">{data.dims.map((d) => {
        const w = draft[d.dimension] ?? String(d.weight)
        return (
          <li key={d.dimension} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" checked={d.is_enabled} aria-label={`Ativar ${d.label}`}
              onChange={(e) => save.mutate({ match: { dimension: d.dimension }, values: { is_enabled: e.target.checked } }, { onSuccess: ok, onError: onErr })} /></label>
            <span className={cn('min-w-0 flex-1', !d.is_enabled && 'text-muted-foreground')}><span className="font-medium">{d.label}</span>{d.description && <span className="block text-xs text-muted-foreground">{d.description}</span>}</span>
            <Input className="h-8 w-20 text-right" type="number" min={0} step="0.5" aria-label={`Peso ${d.label}`} value={w} onChange={(e) => setDraft({ ...draft, [d.dimension]: e.target.value })}
              onBlur={() => { if (w !== String(d.weight) && Number(w) >= 0) save.mutate({ match: { dimension: d.dimension }, values: { weight: Number(w) } }, { onSuccess: ok, onError: onErr }) }} />
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{d.is_enabled && total ? `${Math.round((100 * Number(w)) / total)}%` : '—'}</span>
          </li>
        )
      })}</ul>
    </SectionCard>
  )
}

function Checkpoints() {
  const { data, isPending } = useSettingsData()
  const save = useSaveRow('track_checkpoints')
  const [track, setTrack] = useState<Enums['neoleader_track']>('founder')
  const [title, setTitle] = useState('')
  if (isPending || !data) return <CardSkeleton />
  const list = data.checkpoints.filter((c) => c.track === track)
  return (
    <SectionCard title="Checkpoints por trilha">
      <div className="mb-4 flex flex-wrap gap-2">{Object.entries(TRACK_LABEL).map(([k, l]) => <button key={k} onClick={() => setTrack(k as typeof track)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', track === k ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}>{l}</button>)}</div>
      <ol className="divide-y rounded-lg border">{list.map((c, i) => (
        <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
          <span className="w-6 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
          <InlineText value={c.title} onSave={(v) => save.mutate({ match: { id: c.id }, values: { title: v } }, { onSuccess: ok, onError: onErr })} className={cn(!c.is_active && 'text-muted-foreground line-through')} />
          <ActiveToggle on={c.is_active} onChange={(v) => save.mutate({ match: { id: c.id }, values: { is_active: v } }, { onError: onErr })} />
        </li>
      ))}</ol>
      <AddRow placeholder="Novo checkpoint" value={title} onChange={setTitle} onAdd={() => save.mutate({ values: { track, title, key: `${slug(title)}_${Date.now().toString(36)}`, sort_order: (list[list.length - 1]?.sort_order ?? 0) + 10 } }, { onSuccess: () => { setTitle(''); ok() }, onError: onErr })} />
    </SectionCard>
  )
}

function Milestones() {
  const { data, isPending } = useSettingsData()
  const save = useSaveRow('milestone_templates')
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<Enums['venture_stage'] | ''>('')
  if (isPending || !data) return <CardSkeleton />
  return (
    <SectionCard title="Modelos de milestones dos negócios">
      <p className="mb-4 text-sm text-muted-foreground">Sugeridos ao Neoleader em Meu Negócio, conforme o estágio.</p>
      <ul className="divide-y rounded-lg border">{data.milestones.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
          <InlineText value={m.title} onSave={(v) => save.mutate({ match: { id: m.id }, values: { title: v } }, { onSuccess: ok, onError: onErr })} className={cn(!m.is_active && 'text-muted-foreground line-through')} />
          <Select className="h-8 w-32 text-xs" aria-label="Estágio" value={m.stage ?? ''} onChange={(e) => save.mutate({ match: { id: m.id }, values: { stage: (e.target.value || null) as Enums['venture_stage'] | null } }, { onError: onErr })}><option value="">Qualquer</option>{VENTURE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
          <ActiveToggle on={m.is_active} onChange={(v) => save.mutate({ match: { id: m.id }, values: { is_active: v } }, { onError: onErr })} />
        </li>
      ))}</ul>
      <AddRow placeholder="Novo milestone" value={title} onChange={setTitle} extra={<Select className="w-36" aria-label="Estágio do novo milestone" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)}><option value="">Qualquer estágio</option>{VENTURE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>}
        onAdd={() => save.mutate({ values: { title, stage: stage || null, sort_order: (data.milestones[data.milestones.length - 1]?.sort_order ?? 0) + 10 } }, { onSuccess: () => { setTitle(''); ok() }, onError: onErr })} />
    </SectionCard>
  )
}

const UNIT: Record<Enums['kpi_unit'], string> = { count: 'Contagem', currency: 'R$', percent: '%', number: 'Número' }
function Kpis() {
  const { data, isPending } = useSettingsData()
  const save = useSaveRow('kpi_definitions')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<Enums['kpi_unit']>('number')
  if (isPending || !data) return <CardSkeleton />
  return (
    <SectionCard title="Catálogo de KPIs">
      <p className="mb-4 text-sm text-muted-foreground">Indicadores que os Neoleaders podem acompanhar em Meu Negócio. Os do sistema não podem ser renomeados.</p>
      <ul className="divide-y rounded-lg border">{data.kpis.map((k) => (
        <li key={k.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
          {k.is_system ? <span className="flex-1">{k.name}</span> : <InlineText value={k.name} onSave={(v) => save.mutate({ match: { id: k.id }, values: { name: v } }, { onSuccess: ok, onError: onErr })} />}
          <Badge variant="outline">{UNIT[k.unit]}</Badge>{k.is_system && <Badge variant="secondary">Sistema</Badge>}
        </li>
      ))}</ul>
      <AddRow placeholder="Novo KPI (ex.: NPS)" value={name} onChange={setName} extra={<Select className="w-32" aria-label="Unidade" value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}>{Object.entries(UNIT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}
        onAdd={() => save.mutate({ values: { name, unit, key: `${slug(name)}_${Date.now().toString(36)}` } }, { onSuccess: () => { setName(''); ok() }, onError: onErr })} />
    </SectionCard>
  )
}

function Matrix({ editable }: { editable: boolean }) {
  const { user } = useAuth()
  const { data, isPending } = useRbac()
  const toggle = useToggleRolePermission()
  if (isPending || !data) return <CardSkeleton />
  const isSuper = user?.roles.some((r) => r.key === 'super_admin')
  const roles = data.roles.filter((r) => r.key !== 'super_admin')
  const has = new Set(data.rolePerms.map((rp) => `${rp.role_id}:${rp.permission_key}`))
  const modules = [...new Set(data.permissions.map((p) => p.module))]
  return (
    <SectionCard title="Matriz de cargos e permissões">
      <p className="mb-4 text-sm text-muted-foreground">Super Administrador tem acesso total e não aparece na matriz. {editable ? 'Alterações valem imediatamente para todos com o cargo.' : 'Somente leitura.'} Ajustes por pessoa ficam em Usuários.</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="sticky top-0 bg-muted/60 text-xs"><tr><th className="px-3 py-2 text-left">Permissão</th>{roles.map((r) => <th key={r.id} className="px-2 py-2 text-center font-medium">{r.name}</th>)}</tr></thead>
          <tbody>{modules.map((m) => [
            <tr key={m} className="bg-muted/30"><td colSpan={roles.length + 1} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{MODULE_LABEL[m] ?? m}</td></tr>,
            ...data.permissions.filter((p) => p.module === m).map((p) => {
              const locked = !editable || (p.key === 'permissions.manage' && !isSuper)
              return (
                <tr key={p.key} className="border-t">
                  <td className="px-3 py-1.5"><span className="block">{p.description}</span><code className="text-[11px] text-muted-foreground">{p.key}</code></td>
                  {roles.map((r) => {
                    const on = has.has(`${r.id}:${p.key}`)
                    return <td key={r.id} className="px-2 py-1.5 text-center">
                      {locked ? (on ? <span className="text-success" aria-label="Sim">●</span> : <span className="text-muted-foreground/40" aria-label="Não">·</span>) : (
                        <input type="checkbox" className="h-4 w-4 accent-primary" checked={on} aria-label={`${r.name}: ${p.key}`} disabled={toggle.isPending}
                          onChange={(e) => { if (!e.target.checked || p.module !== 'settings' || window.confirm('Conceder uma permissão de configurações a todo o cargo?')) toggle.mutate({ roleId: r.id, key: p.key, on: e.target.checked }, { onError: onErr }) }} />
                      )}
                    </td>
                  })}
                </tr>
              )
            }),
          ])}</tbody>
        </table>
      </div>
      {!editable && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Editar exige a permissão permissions.manage.</p>}
    </SectionCard>
  )
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'item'

function InlineText({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [v, setV] = useState(value)
  return <input className={cn('min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 hover:border-input focus:border-input focus:outline-none focus:ring-2 focus:ring-ring', className)} value={v} aria-label="Título"
    onChange={(e) => setV(e.target.value)} onBlur={() => { if (v.trim() && v !== value) onSave(v.trim()); else setV(value) }} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
}
function ActiveToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button onClick={() => onChange(!on)} className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', on ? 'border-success/50 text-success' : 'text-muted-foreground')}>{on ? 'Ativo' : 'Inativo'}</button>
}
function AddRow({ placeholder, value, onChange, onAdd, extra }: { placeholder: string; value: string; onChange: (v: string) => void; onAdd: () => void; extra?: React.ReactNode }) {
  return (
    <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (value.trim().length >= 2) onAdd() }}>
      <Input className="min-w-0 flex-1" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />{extra}
      <Button type="submit" variant="outline" disabled={value.trim().length < 2}><Plus />Adicionar</Button>
    </form>
  )
}
