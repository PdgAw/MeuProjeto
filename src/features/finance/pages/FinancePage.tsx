import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Kpi } from '@/features/management/components/Kpi'
import { useAllStudents } from '@/features/management/api'
import { downloadCsv } from '@/lib/csv'
import { fmtCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { localToday, useAgreements, useCreateAgreement } from '../api'
import { AgreementCard } from '../components/AgreementCard'

/** Financeiro acadêmico: contratos, bolsas/descontos e parcelas (sem gateway — baixa manual). */
export default function FinancePage() {
  const { hasPermission } = useAuth()
  const { data, isPending } = useAgreements()
  const [q, setQ] = useState('')
  const [onlyLate, setOnlyLate] = useState(false)
  const all = data ?? []
  const month = localToday().slice(0, 7)
  const inst = all.flatMap((a) => a.status === 'canceled' ? [] : a.installments)
  const dueMonth = inst.filter((i) => i.due_date.startsWith(month) && i.status !== 'canceled' && i.status !== 'waived')
  const receivedMonth = inst.filter((i) => i.status === 'paid' && i.paid_at && i.paid_at.slice(0, 7) === month).reduce((s, i) => s + Number(i.amount), 0)
  const late = all.reduce((s, a) => s + a.late, 0)
  const lateStudents = all.filter((a) => a.late > 0).length
  const scholarships = all.filter((a) => a.adjustments.some((x) => x.kind === 'scholarship')).length
  const list = all.filter((a) => (!q || (a.student?.full_name ?? '').toLowerCase().includes(q.toLowerCase())) && (!onlyLate || a.late > 0))
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Financeiro acadêmico</h1><p className="mt-1 text-muted-foreground">Contratos, bolsas e parcelas. Baixas manuais — sem gateway de pagamento nesta versão.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!all.length} onClick={() => downloadCsv(all.flatMap((a) => a.installments.map((i) => ({ Neoleader: a.student?.full_name, Turma: a.cohort?.name ?? '', Parcela: `${i.number}/${a.installments_count}`, Vencimento: i.due_date, Valor: Number(i.amount).toFixed(2).replace('.', ','), Situação: i.late ? 'Em atraso' : i.status, Pago_em: i.paid_at?.slice(0, 10) ?? '', Forma: i.payment_method ?? '' }))), 'financeiro-parcelas')}>Exportar CSV</Button>
          {hasPermission('finance.manage') && <NewAgreementDialog />}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="A receber no mês" value={fmtCurrency(dueMonth.filter((i) => i.status !== 'paid').reduce((s, i) => s + Number(i.amount), 0))} hint={`${dueMonth.length} parcelas vencem no mês`} />
        <Kpi label="Recebido no mês" value={fmtCurrency(receivedMonth)} tone="good" />
        <Kpi label="Em atraso" value={fmtCurrency(late)} hint={`${lateStudents} contrato(s)`} tone={late > 0 ? 'warn' : undefined} />
        <Kpi label="Contratos ativos" value={String(all.filter((a) => a.status === 'active').length)} hint={`${scholarships} com bolsa`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar Neoleader" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar Neoleader" /></div>
        <button onClick={() => setOnlyLate(!onlyLate)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', onlyLate ? 'border-destructive bg-destructive/10 text-destructive' : 'hover:bg-secondary')}>Só em atraso</button>
      </div>
      {isPending ? <CardSkeleton lines={5} /> : !list.length ? <EmptyState text="Nenhum contrato." /> : <div className="space-y-3">{list.map((a) => <AgreementCard key={a.id} a={a} />)}</div>}
    </div>
  )
}

function NewAgreementDialog() {
  const students = useAllStudents()
  const create = useCreateAgreement()
  const [open, setOpen] = useState(false)
  const init = { student: '', total: '', installments: '12', firstDue: localToday(), discount: '0', kind: 'discount' as 'discount' | 'scholarship', reason: '' }
  const [v, setV] = useState(init)
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }))
  const s = students.data?.find((x) => x.user_id === v.student)
  const total = Number(v.total.replace(/\./g, '').replace(',', '.')) || 0
  const net = total * (1 - (Number(v.discount) || 0) / 100)
  const n = Math.max(1, Number(v.installments) || 1)
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setV(init) }}>
      <Button onClick={() => setOpen(true)}><Plus />Novo contrato</Button>
      <DialogContent title="Novo contrato financeiro" description="As parcelas são geradas automaticamente, mês a mês.">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          if (!s) return toast.error('Selecione o Neoleader.')
          if (total <= 0) return toast.error('Informe o valor total.')
          create.mutate({ student: s.user_id, cohort: s.cohort_id, total, installments: n, firstDue: v.firstDue, discount: Number(v.discount) || 0, kind: v.kind, reason: v.reason },
            { onSuccess: () => { toast.success('Contrato criado com as parcelas.'); setOpen(false) }, onError: (er) => toast.error(er.message) })
        }}>
          <FormField id="ag-st" label="Neoleader"><Select id="ag-st" value={v.student} onChange={set('student')}><option value="">Selecione</option>{students.data?.map((x) => <option key={`${x.cohort_id}-${x.user_id}`} value={x.user_id}>{x.full_name} · {x.cohort_name}</option>)}</Select></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="ag-total" label="Valor total (R$)"><Input id="ag-total" inputMode="decimal" value={v.total} onChange={set('total')} placeholder="24000" /></FormField>
            <FormField id="ag-n" label="Parcelas"><Input id="ag-n" type="number" min={1} max={60} value={v.installments} onChange={set('installments')} /></FormField>
            <FormField id="ag-due" label="1º vencimento"><Input id="ag-due" type="date" value={v.firstDue} onChange={set('firstDue')} /></FormField>
            <FormField id="ag-kind" label="Bolsa / desconto"><Select id="ag-kind" value={v.kind} onChange={set('kind')}><option value="discount">Desconto</option><option value="scholarship">Bolsa</option></Select></FormField>
            <FormField id="ag-pct" label="Percentual (%)"><Input id="ag-pct" type="number" min={0} max={100} step="0.5" value={v.discount} onChange={set('discount')} /></FormField>
            <FormField id="ag-reason" label="Motivo"><Input id="ag-reason" value={v.reason} onChange={set('reason')} placeholder="Ex.: bolsa mérito" /></FormField>
          </div>
          {total > 0 && <p className="rounded-md bg-muted/50 p-3 text-sm">Valor líquido <strong>{fmtCurrency(net)}</strong> em {n}x de aproximadamente <strong>{fmtCurrency(net / n)}</strong>.</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Criar contrato</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
