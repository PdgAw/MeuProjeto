import { Inbox } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtRelative } from '@/lib/format'
import { cn, initials } from '@/lib/utils'
import { REQUEST_TYPE_LABEL, STAFF_STATUS_LABEL, useRequests } from '../api'
import { RequestThread } from '../components/RequestThread'

const FILTERS = [['pending', 'Em aberto'], ['mine', 'Comigo'], ['awaiting_user', 'Aguardando solicitante'], ['closed', 'Encerradas'], ['all', 'Todas']] as const

/** Secretariat queue: triage, assign, answer (public or internal) and resolve requests. */
export default function RequestsQueuePage() {
  const { user } = useAuth()
  const { data, isPending } = useRequests('all')
  const [params, setParams] = useSearchParams()
  const [f, setF] = useState<(typeof FILTERS)[number][0]>('pending')
  const [type, setType] = useState('')
  const sel = params.get('id')
  const list = (data ?? []).filter((r) => (!type || r.type === type) && (
    f === 'all' || (f === 'pending' && ['open', 'in_review'].includes(r.status)) || (f === 'mine' && r.assignee?.id === user?.user_id && !['resolved', 'canceled'].includes(r.status))
    || (f === 'awaiting_user' && r.status === 'awaiting_user') || (f === 'closed' && ['resolved', 'canceled'].includes(r.status))))
  const unassigned = (data ?? []).filter((r) => r.status === 'open' && !r.assignee).length
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Solicitações</h1>
        <p className="mt-1 text-muted-foreground">{(data ?? []).filter((r) => ['open', 'in_review'].includes(r.status)).length} em aberto · {unassigned} sem responsável</p></header>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setF(k)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', f === k ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}>{l}</button>)}
        <Select className="w-44" value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo"><option value="">Todos os tipos</option>{Object.entries(REQUEST_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className={cn(sel && 'hidden lg:block')}>
          {isPending ? <CardSkeleton lines={5} /> : !list.length ? <EmptyState icon={<Inbox className="h-8 w-8" />} text="Nada por aqui." /> : (
            <ul className="divide-y rounded-lg border bg-card">{list.map((r) => (
              <li key={r.id}><button onClick={() => setParams({ id: r.id })} className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-secondary/40', sel === r.id && 'bg-secondary/60')}>
                <Avatar className="h-8 w-8">{r.requester?.avatar_url && <AvatarImage src={r.requester.avatar_url} alt="" />}<AvatarFallback className="text-xs">{initials(r.requester?.full_name)}</AvatarFallback></Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{r.subject}</span>{r.priority === 'high' && <Badge variant="destructive" className="text-[10px]">Alta</Badge>}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.requester?.full_name} · {REQUEST_TYPE_LABEL[r.type]} · {fmtRelative(r.updated_at)}</span>
                  <span className="mt-1 flex gap-1"><Badge variant={r.status === 'open' ? 'default' : r.status === 'resolved' ? 'success' : 'secondary'} className="text-[10px]">{STAFF_STATUS_LABEL[r.status]}</Badge>{r.assignee ? <Badge variant="outline" className="text-[10px]">{r.assignee.full_name}</Badge> : r.status === 'open' && <Badge variant="warning" className="text-[10px]">Sem responsável</Badge>}</span>
                </span>
              </button></li>
            ))}</ul>
          )}
        </div>
        <div className={cn(!sel && 'hidden lg:block')}>
          {sel ? (<>
            <button onClick={() => setParams({})} className="mb-3 text-sm text-muted-foreground hover:text-foreground lg:hidden">← Voltar à fila</button>
            <Card><CardContent className="pt-6"><RequestThread id={sel} staff /></CardContent></Card>
          </>) : <EmptyState text="Selecione uma solicitação." />}
        </div>
      </div>
    </div>
  )
}
