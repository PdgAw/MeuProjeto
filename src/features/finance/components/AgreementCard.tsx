import { ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useMarkInstallment } from '@/features/management/api'
import { fmtCurrency, parseLocalDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AGREEMENT_LABEL, INSTALLMENT_LABEL, useSetAgreementStatus, type Agreement } from '../api'

export function AgreementCard({ a, showStudent = true, defaultOpen = false }: { a: Agreement; showStudent?: boolean; defaultOpen?: boolean }) {
  const { hasPermission } = useAuth()
  const manage = hasPermission('finance.manage')
  const [open, setOpen] = useState(defaultOpen)
  const mark = useMarkInstallment()
  const setStatus = useSetAgreementStatus()
  const pct = a.net ? Math.round((100 * a.paid) / a.net) : 0
  const onErr = (e: Error) => toast.error(e.message)
  return (
    <div className="rounded-lg border bg-card">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left">
        <span className="min-w-0 flex-1">
          {showStudent && <span className="block font-medium">{a.student?.full_name}</span>}
          <span className="text-xs text-muted-foreground">{a.cohort?.name ?? 'Sem turma'} · {a.installments_count}x · contrato de {fmtCurrency(Number(a.total_amount))}</span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {a.adjustments.map((x) => <Badge key={x.id} variant="accent">{x.kind === 'scholarship' ? 'Bolsa' : 'Desconto'} {x.percent ? `${Number(x.percent)}%` : fmtCurrency(Number(x.amount))}</Badge>)}
          {a.late > 0 && <Badge variant="destructive">{fmtCurrency(a.late)} em atraso</Badge>}
          <Badge variant={a.status === 'active' ? 'default' : a.status === 'completed' ? 'success' : 'outline'}>{AGREEMENT_LABEL[a.status]}</Badge>
        </span>
        <span className="flex w-full items-center gap-3 sm:w-48"><Progress value={pct} className="h-2" /><span className="text-xs tabular-nums text-muted-foreground">{pct}%</span></span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>Pago <strong>{fmtCurrency(a.paid)}</strong> · em aberto <strong>{fmtCurrency(a.open)}</strong> · valor líquido {fmtCurrency(a.net)}</span>
            <span className="flex gap-2">
              {showStudent && a.student && <Button asChild variant="ghost" size="sm"><Link to={`/gestao/neoleaders/${a.student.id}`}>Perfil 360º</Link></Button>}
              {manage && <Select className="h-8 w-36 text-xs" aria-label="Status do contrato" value={a.status} onChange={(e) => setStatus.mutate({ id: a.id, status: e.target.value as Agreement['status'] }, { onSuccess: () => toast.success('Contrato atualizado.'), onError: onErr })}>
                {Object.entries(AGREEMENT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1.5">Parcela</th><th>Vencimento</th><th className="text-right">Valor</th><th className="pl-4">Situação</th>{manage && <th />}</tr></thead>
              <tbody className="divide-y">{a.installments.map((i) => (
                <tr key={i.id}>
                  <td className="py-2 tabular-nums">{i.number}/{a.installments_count}</td>
                  <td className={cn('tabular-nums', i.late && 'font-semibold text-destructive')}>{format(parseLocalDate(i.due_date), 'dd/MM/yyyy')}</td>
                  <td className="text-right tabular-nums">{fmtCurrency(Number(i.amount))}</td>
                  <td className="pl-4"><Badge variant={i.status === 'paid' ? 'success' : i.late ? 'destructive' : i.status === 'pending' ? 'secondary' : 'outline'}>{i.late ? 'Em atraso' : INSTALLMENT_LABEL[i.status]}</Badge>
                    {i.paid_at && <span className="ml-2 text-xs text-muted-foreground">{format(new Date(i.paid_at), 'dd/MM')}{i.payment_method ? ` · ${i.payment_method}` : ''}</span>}</td>
                  {manage && <td className="text-right">{i.status === 'paid' ? (
                    <Button variant="ghost" size="sm" onClick={() => window.confirm('Estornar esta baixa?') && mark.mutate({ id: i.id, status: 'pending' }, { onError: onErr })}>Estornar</Button>
                  ) : i.status === 'pending' || i.status === 'overdue' ? (
                    <span className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => { const m = window.prompt('Forma de pagamento (Pix, boleto, cartão…)', 'Pix'); if (m !== null) mark.mutate({ id: i.id, status: 'paid', method: m || undefined }, { onSuccess: () => toast.success(`Parcela ${i.number} baixada.`), onError: onErr }) }}>Baixar</Button>
                      <Button variant="ghost" size="sm" onClick={() => window.confirm('Isentar esta parcela?') && mark.mutate({ id: i.id, status: 'waived' }, { onError: onErr })}>Isentar</Button>
                    </span>
                  ) : null}</td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
