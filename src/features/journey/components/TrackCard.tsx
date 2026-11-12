import { CheckCircle2, CircleDashed, CircleDot, Compass } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { CHECKPOINT_STATUS_LABEL, TRACK_LABEL } from '@/config/labels'
import type { NeoleaderTrack } from '@/features/auth/types'
import { cn } from '@/lib/utils'
import { useSetCheckpointStatus, useTrackCheckpoints } from '../api'

const NEXT = { not_started: 'in_progress', in_progress: 'done', done: 'not_started' } as const

/** Trilha do Neoleader (Founder: ideia → escala · Sucessor: empresa familiar → plano estratégico). */
export function TrackCard({ userId, track, editable }: { userId: string; track: NeoleaderTrack | null; editable: boolean }) {
  const { data, isPending } = useTrackCheckpoints(userId, track)
  const setStatus = useSetCheckpointStatus(userId)
  if (!track) return null
  const done = data?.filter((c) => c.status === 'done').length ?? 0

  return (
    <SectionCard
      title={<>Sua trilha <Badge variant="accent" className="ml-1">{TRACK_LABEL[track]}</Badge></>}
      icon={<Compass className="h-4 w-4 text-primary" />}
    >
      {isPending ? <CardSkeleton /> : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {done} de {data?.length} etapas concluídas{editable ? ' · toque em uma etapa para atualizar' : ''}
          </p>
          <ol className="grid gap-2">
            {data?.map((c, i) => {
              const Icon = c.status === 'done' ? CheckCircle2 : c.status === 'in_progress' ? CircleDot : CircleDashed
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={!editable || setStatus.isPending}
                    onClick={() =>
                      setStatus.mutate({ checkpointId: c.id, status: NEXT[c.status] }, {
                        onSuccess: () => toast.success(`${c.title}: ${CHECKPOINT_STATUS_LABEL[NEXT[c.status]]}`),
                        onError: (e) => toast.error(e.message),
                      })
                    }
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-default',
                      editable && 'hover:border-primary/50',
                      c.status === 'done' && 'border-success/30 bg-success/5',
                      c.status === 'in_progress' && 'border-primary/40 bg-primary/5',
                    )}
                    title={c.description ?? undefined}
                  >
                    <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                    <Icon className={cn('h-4 w-4 shrink-0', c.status === 'done' ? 'text-success' : c.status === 'in_progress' ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="flex-1 text-sm font-medium">{c.title}</span>
                    <span className="text-[11px] text-muted-foreground">{CHECKPOINT_STATUS_LABEL[c.status]}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </SectionCard>
  )
}
