import { format, parseISO, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDownRight, ArrowUpRight, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/SectionCard'
import { cn } from '@/lib/utils'
import { useAddKpi, useKpiDefinitions, useRecordKpiValue, useRemoveKpi, type VentureDetail, type VentureKpi } from '../api'
import { fmtKpi, UNIT_LABEL } from './format'

/**
 * Business Dashboard: the Neoleader picks which KPIs to track.
 * One small chart per KPI (small multiples, single hue, one axis each) — never a dual-axis chart.
 */
export function KpiDashboard({ venture, editable }: { venture: VentureDetail; editable: boolean }) {
  const kpis = venture.venture_kpis.filter((k) => k.is_active).sort((a, b) => a.sort_order - b.sort_order)
  const remove = useRemoveKpi(venture.id)
  const [adding, setAdding] = useState(false)
  const [recording, setRecording] = useState<VentureKpi | null>(null)
  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setAdding(true)}><Plus /> Escolher KPI</Button>
        </div>
      )}
      {!kpis.length ? <EmptyState text={editable ? 'Escolha os indicadores que fazem sentido para o seu negócio: clientes, MRR, receita, NPS…' : 'Nenhum KPI acompanhado ainda.'} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kpis.map((k) => (
            <KpiCard key={k.id} kpi={k} editable={editable} onRecord={() => setRecording(k)}
              onRemove={() => { if (confirm('Parar de acompanhar este KPI? O histórico é mantido.')) remove.mutate(k.id) }} />
          ))}
        </div>
      )}
      {adding && <AddKpiDialog ventureId={venture.id} existing={kpis.map((k) => k.definition_id).filter(Boolean) as string[]} onClose={() => setAdding(false)} />}
      {recording && <RecordValueDialog ventureId={venture.id} kpi={recording} onClose={() => setRecording(null)} />}
    </div>
  )
}

const kpiName = (k: VentureKpi) => k.definition?.name ?? k.custom_name ?? 'KPI'

function KpiCard({ kpi, editable, onRecord, onRemove }: { kpi: VentureKpi; editable: boolean; onRecord: () => void; onRemove: () => void }) {
  const values = [...kpi.venture_kpi_values].sort((a, b) => a.period_start.localeCompare(b.period_start))
  const last = values[values.length - 1]
  const prev = values[values.length - 2]
  const higherBetter = kpi.definition?.higher_is_better ?? true
  const delta = last && prev ? Number(last.value) - Number(prev.value) : null
  const good = delta === null || delta === 0 ? null : (delta > 0) === higherBetter
  const target = kpi.target_value === null ? null : Number(kpi.target_value)
  const data = values.map((v) => ({ label: format(parseISO(v.period_start), 'MMM/yy', { locale: ptBR }), value: Number(v.value) }))
  const name = kpiName(kpi)
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{name}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{fmtKpi(last?.value, kpi.unit)}</p>
          {delta !== null && (
            <p className="flex items-center gap-1 text-xs">
              {good === null ? <Minus className="h-3 w-3 text-muted-foreground" /> : good ? <ArrowUpRight className="h-3 w-3 text-success" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
              <span className="text-muted-foreground">{delta > 0 ? '+' : ''}{fmtKpi(delta, kpi.unit)} vs. período anterior</span>
            </p>
          )}
        </div>
        {editable && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRemove} aria-label={`Remover ${name}`}><Trash2 className="h-4 w-4" /></Button>}
      </div>
      {data.length > 1 ? (
        <div className="h-28" role="img" aria-label={`Evolução de ${name}: ${data.map((d) => `${d.label} ${fmtKpi(d.value, kpi.unit)}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" padding={{ left: 12, right: 12 }} interval="preserveStartEnd" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 'auto']} />
              {target !== null && <ReferenceLine y={target} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />}
              <Line dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              <Tooltip cursor={{ stroke: 'hsl(var(--border))' }} content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { label: string; value: number } | undefined
                if (!active || !p) return null
                return <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md"><p className="font-medium first-letter:uppercase">{p.label}</p><p className="text-muted-foreground">{fmtKpi(p.value, kpi.unit)}</p></div>
              }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="py-6 text-center text-xs text-muted-foreground">Registre ao menos 2 períodos para ver a evolução.</p>}
      {target !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground"><span>Meta (linha tracejada)</span><span className="tabular-nums">{fmtKpi(target, kpi.unit)}</span></div>
          <Progress value={Math.min(100, last ? (100 * Number(last.value)) / (target || 1) : 0)} className="h-1.5" />
        </div>
      )}
      {editable && <Button size="sm" variant="outline" className="mt-auto" onClick={onRecord}>Registrar valor</Button>}
    </Card>
  )
}

function AddKpiDialog({ ventureId, existing, onClose }: { ventureId: string; existing: string[]; onClose: () => void }) {
  const defs = useKpiDefinitions()
  const add = useAddKpi(ventureId)
  const [choice, setChoice] = useState('')
  const [custom, setCustom] = useState('')
  const [unit, setUnit] = useState<'count' | 'currency' | 'percent' | 'number'>('number')
  const [target, setTarget] = useState('')
  const available = (defs.data ?? []).filter((d) => !existing.includes(d.id))
  const def = available.find((d) => d.id === choice)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Escolher KPI" description="Acompanhe só o que ajuda a decidir.">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          if (!choice) return toast.error('Escolha um KPI.')
          if (choice === 'custom' && !custom.trim()) return toast.error('Dê um nome ao KPI.')
          add.mutate({ definitionId: def?.id, customName: choice === 'custom' ? custom.trim() : undefined, unit: def?.unit ?? unit, target: target ? Number(target) : null },
            { onSuccess: () => { toast.success('KPI adicionado.'); onClose() }, onError: (er) => toast.error(er.message) })
        }}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {available.map((d) => (
              <button type="button" key={d.id} onClick={() => setChoice(d.id)}
                className={cn('rounded-md border px-3 py-2 text-left text-sm', choice === d.id ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-secondary')}>{d.name}</button>
            ))}
            <button type="button" onClick={() => setChoice('custom')} className={cn('rounded-md border border-dashed px-3 py-2 text-left text-sm', choice === 'custom' ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-secondary')}>Outro KPI…</button>
          </div>
          {choice === 'custom' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="k-name" label="Nome"><Input id="k-name" value={custom} onChange={(e) => setCustom(e.target.value)} /></FormField>
              <FormField id="k-unit" label="Unidade"><Select id="k-unit" value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}>{Object.entries(UNIT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
            </div>
          )}
          <FormField id="k-target" label="Meta (opcional)"><Input id="k-target" type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></FormField>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={add.isPending}>Adicionar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RecordValueDialog({ ventureId, kpi, onClose }: { ventureId: string; kpi: VentureKpi; onClose: () => void }) {
  const record = useRecordKpiValue(ventureId)
  const [month, setMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM'))
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Registrar ${kpiName(kpi)}`} description="Um valor por mês; registrar de novo o mesmo mês substitui o anterior.">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          if (value === '' || Number.isNaN(Number(value))) return toast.error('Informe um número.')
          record.mutate({ kpiId: kpi.id, period: `${month}-01`, value: Number(value), note: note || null },
            { onSuccess: () => { toast.success('Valor registrado.'); onClose() }, onError: (er) => toast.error(er.message) })
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="rv-m" label="Mês"><Input id="rv-m" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></FormField>
            <FormField id="rv-v" label={`Valor (${UNIT_LABEL[kpi.unit]})`}><Input id="rv-v" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} /></FormField>
          </div>
          <FormField id="rv-n" label="Observação"><Input id="rv-n" value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={record.isPending}>Registrar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
