import { ClipboardList, Inbox, Receipt, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtCurrency, fmtDayMonth, fmtRelative, parseLocalDate } from '@/lib/format'
import { firstName, greeting } from '@/lib/utils'
import { useMarkInstallment, useSecretaryQueue } from '../api'

export default function SecretaryDashboardPage() {
  const { user, hasPermission } = useAuth()
  const { data, isPending } = useSecretaryQueue()
  const mark = useMarkInstallment()
  if (!user) return null
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">{greeting()}, {firstName(user.preferred_name || user.full_name)}.</h1><p className="mt-1 text-muted-foreground">Cadastros, matrículas, solicitações e financeiro.</p></header>
      {isPending || !data ? <CardSkeleton lines={4} /> : (
        <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <SectionCard title="Solicitações em aberto" icon={<Inbox className="h-4 w-4 text-primary" />} action={{ label: 'Todas', to: '/gestao/solicitacoes' }}>
            {!data.requests.length ? <EmptyState text="Nenhuma solicitação pendente." /> : (
              <ul className="divide-y">{data.requests.map((r) => (
                <li key={r.id}><Link to={`/gestao/solicitacoes?id=${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:underline">
                  <span className="min-w-0"><span className="block truncate font-medium">{r.subject}</span><span className="text-xs text-muted-foreground">{r.requester?.full_name} · {fmtRelative(r.created_at)}</span></span>
                  {r.priority === 'high' && <Badge variant="destructive">Alta</Badge>}
                </Link></li>
              ))}</ul>
            )}
          </SectionCard>
          <SectionCard title="Admissões recentes" icon={<UserPlus className="h-4 w-4 text-primary" />} action={{ label: 'Pipeline', to: '/gestao/admissoes' }}>
            {!data.candidates.length ? <EmptyState text="Nada novo." /> : (
              <ul className="divide-y">{data.candidates.map((c) => (
                <li key={c.id}><Link to={`/gestao/admissoes/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:underline">
                  <span className="font-medium">{c.full_name}</span>
                  <Badge variant={c.status === 'approved' ? 'success' : 'secondary'}>{c.status === 'approved' ? 'Aprovado: matricular' : c.status === 'new_lead' ? 'Novo interessado' : 'Inscrição recebida'}</Badge>
                </Link></li>
              ))}</ul>
            )}
          </SectionCard>
          {hasPermission('finance.view') && (
            <SectionCard title="Parcelas vencidas" icon={<Receipt className="h-4 w-4 text-warning" />} action={{ label: 'Financeiro', to: '/gestao/financeiro' }}>
              {!data.installments.length ? <EmptyState text="Nenhuma parcela vencida." /> : (
                <ul className="divide-y">{data.installments.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0"><span className="block truncate font-medium">{i.agreement.student?.full_name}</span><span className="text-xs text-muted-foreground">Parcela {i.number} · venceu {fmtDayMonth(parseLocalDate(i.due_date))}</span></span>
                    <span className="flex items-center gap-2"><span className="tabular-nums">{fmtCurrency(Number(i.amount))}</span>
                      {hasPermission('finance.manage') && <Button size="sm" variant="outline" onClick={() => mark.mutate({ id: i.id, status: 'paid', method: 'Baixa manual' }, { onSuccess: () => toast.success('Pagamento registrado.') })}>Baixar</Button>}</span>
                  </li>
                ))}</ul>
              )}
            </SectionCard>
          )}
          <SectionCard title="Matrículas recentes" icon={<ClipboardList className="h-4 w-4 text-primary" />} action={{ label: 'Neoleaders', to: '/gestao/neoleaders' }}>
            <ul className="divide-y">{data.enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><Link to={`/gestao/neoleaders/${e.user?.id}`} className="font-medium hover:underline">{e.user?.full_name}</Link><span className="text-xs text-muted-foreground">{e.cohort?.name}</span></li>
            ))}</ul>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
