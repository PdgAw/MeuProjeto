import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { VENTURE_STAGES } from '@/config/labels'
import { cn } from '@/lib/utils'
import { useSaveVenture, type VentureDetail } from '../api'

/** Ideação → Validação → MVP → Operação → Tração → Escala. Editors click a stage to move. */
export function StageStepper({ venture, editable }: { venture: VentureDetail; editable: boolean }) {
  const save = useSaveVenture()
  const idx = VENTURE_STAGES.findIndex((s) => s.key === venture.stage)
  return (
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Estágio do negócio">
      {VENTURE_STAGES.map((s, i) => {
        const done = i < idx
        const current = i === idx
        return (
          <li key={s.key}>
            <button
              type="button"
              disabled={!editable || current || save.isPending}
              onClick={() => {
                if (!confirm(`Mover ${venture.name} para "${s.label}"? A mudança entra na sua jornada.`)) return
                save.mutate({ id: venture.id, owner_id: venture.owner_id, name: venture.name, stage: s.key },
                  { onSuccess: () => toast.success(`Negócio avançou para ${s.label}.`), onError: (e) => toast.error(e.message) })
              }}
              className={cn(
                'flex w-full flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-colors disabled:cursor-default',
                current && 'border-primary bg-primary/5', editable && !current && 'hover:border-primary/40',
              )}
              aria-current={current ? 'step' : undefined}
            >
              <span className={cn('h-1.5 rounded-full', i <= idx ? 'bg-primary' : 'bg-secondary')} />
              <span className="flex items-center gap-1 text-xs font-medium">
                {done && <Check className="h-3 w-3 text-primary" />}{s.label}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
