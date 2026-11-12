import { Check, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { fmtDayMonth, parseLocalDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useActionItems, useAddActionItem, useSetActionItemStatus } from '../api'

/** Próximos passos: Neoleader checks them off, Neomentor follows and adds. */
export function ActionItemsPanel({ sessionId, studentId, canAdd }: { sessionId?: string; studentId: string; canAdd: boolean }) {
  const { data, isPending } = useActionItems(sessionId ? { sessionId } : { studentId })
  const setStatus = useSetActionItemStatus()
  const add = useAddActionItem()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (isPending) return <CardSkeleton lines={2} />
  const items = data ?? []
  const done = items.filter((i) => i.status === 'done').length
  return (
    <div className="space-y-3">
      {items.length > 0 && <p className="text-xs text-muted-foreground">{done} de {items.length} concluídos</p>}
      {!items.length ? <EmptyState text="Nenhum próximo passo." /> : (
        <ul className="space-y-2">
          {items.filter((i) => i.status !== 'canceled').map((i) => {
            const late = i.status === 'open' && i.due_date && parseLocalDate(i.due_date) < today
            return (
              <li key={i.id} className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => setStatus.mutate({ id: i.id, status: i.status === 'done' ? 'open' : 'done' }, { onError: (e) => toast.error(e.message) })}
                  className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border-2', i.status === 'done' ? 'border-success bg-success text-success-foreground' : 'border-input hover:border-success')}
                  aria-label={i.status === 'done' ? `Reabrir: ${i.title}` : `Concluir: ${i.title}`}
                >{i.status === 'done' ? <Check className="h-3 w-3" /> : null}</button>
                <span className={cn('flex-1', i.status === 'done' && 'text-muted-foreground line-through')}>{i.title}</span>
                {i.due_date && <span className={cn('text-xs', late ? 'font-semibold text-destructive' : 'text-muted-foreground')}>{late ? 'atrasado · ' : 'até '}{fmtDayMonth(parseLocalDate(i.due_date))}</span>}
                {i.status === 'done' && <RotateCcw className="h-3 w-3 text-muted-foreground" aria-hidden />}
              </li>
            )
          })}
        </ul>
      )}
      {canAdd && sessionId && (
        <form className="flex gap-2 pt-1" onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          add.mutate({ sessionId, studentId, title: title.trim(), dueDate: due || null }, { onSuccess: () => { setTitle(''); setDue('') }, onError: (er) => toast.error(er.message) })
        }}>
          <Input placeholder="Novo passo" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Novo passo" />
          <Input type="date" className="w-40" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Prazo" />
          <Button type="submit" size="icon" variant="outline" aria-label="Adicionar"><Plus /></Button>
        </form>
      )}
    </div>
  )
}
