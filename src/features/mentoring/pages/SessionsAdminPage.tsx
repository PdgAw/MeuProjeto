import { useState } from 'react'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { cn } from '@/lib/utils'
import { useSessions } from '../api'
import { SESSION_STATUS } from '../components/labels'
import { SessionRow } from './SessionRow'

type F = 'all' | keyof typeof SESSION_STATUS

/** Management overview of every Neomentoria. Private notes stay hidden from this list. */
export default function SessionsAdminPage() {
  const { data, isPending } = useSessions({})
  const [f, setF] = useState<F>('all')
  const list = (data ?? []).filter((s) => f === 'all' || s.status === f)
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Mentorias</h1><p className="mt-1 text-muted-foreground">Todas as Neomentorias da escola.</p></header>
      <div className="flex flex-wrap gap-2">
        {(['all', 'requested', 'scheduled', 'completed', 'canceled'] as F[]).map((k) => (
          <button key={k} onClick={() => setF(k)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', f === k ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}>
            {k === 'all' ? 'Todas' : SESSION_STATUS[k].label} ({k === 'all' ? data?.length ?? 0 : data?.filter((s) => s.status === k).length ?? 0})
          </button>
        ))}
      </div>
      {isPending ? <CardSkeleton lines={4} /> : !list.length ? <EmptyState text="Nenhuma mentoria." /> : <ul className="divide-y rounded-lg border bg-card">{list.map((s) => <SessionRow key={s.id} s={s} viewer="staff" />)}</ul>}
    </div>
  )
}
