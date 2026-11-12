import { Check, ClipboardList, FileWarning, ListTodo } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { usePendingAssignments } from '@/features/academic/api'
import { usePendingDocuments } from '@/features/documents/api'
import { useCompleteActionItem, useOpenActionItems } from '@/features/mentoring/api'
import { fmtDayMonth, fmtWhen, parseLocalDate } from '@/lib/format'

/** Entregas, próximos passos de mentoria e documentos pendentes. */
export function PendingCard({ userId }: { userId: string }) {
  const assignments = usePendingAssignments(userId)
  const steps = useOpenActionItems(userId)
  const docs = usePendingDocuments(userId)
  const complete = useCompleteActionItem()
  const loading = assignments.isPending || steps.isPending || docs.isPending
  const empty = !loading && !assignments.data?.length && !steps.data?.length && !docs.data?.length

  return (
    <SectionCard title="Pendências" icon={<ListTodo className="h-4 w-4 text-primary" />}>
      {loading ? <CardSkeleton /> : empty ? <EmptyState text="Nenhuma pendência. Excelente!" /> : (
        <div className="space-y-5">
          {!!assignments.data?.length && (
            <Group icon={<ClipboardList className="h-3.5 w-3.5" />} title="Entregas">
              {assignments.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.subject?.name}</p>
                  </div>
                  {a.due_at && <Badge variant="warning" className="shrink-0">{fmtWhen(a.due_at)}</Badge>}
                </li>
              ))}
            </Group>
          )}
          {!!steps.data?.length && (
            <Group icon={<ListTodo className="h-3.5 w-3.5" />} title="Próximos passos da mentoria">
              {steps.data.map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => complete.mutate(s.id, { onSuccess: () => toast.success('Passo concluído!') })}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-input text-transparent hover:border-success hover:text-success"
                    aria-label={`Concluir: ${s.title}`}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <span className="flex-1">{s.title}</span>
                  {s.due_date && <span className="text-xs text-muted-foreground">até {fmtDayMonth(parseLocalDate(s.due_date))}</span>}
                </li>
              ))}
            </Group>
          )}
          {!!docs.data?.length && (
            <Group icon={<FileWarning className="h-3.5 w-3.5" />} title="Documentos">
              {docs.data.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{d.title}</span>
                  <Badge variant={d.status === 'signature_pending' ? 'destructive' : 'secondary'} className="shrink-0">
                    {d.status === 'signature_pending' ? 'Assinatura pendente' : 'Leitura obrigatória'}
                  </Badge>
                </li>
              ))}
            </Group>
          )}
        </div>
      )}
    </SectionCard>
  )
}

function Group({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{icon}{title}</p>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  )
}
