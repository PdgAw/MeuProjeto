import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PitchStatus } from '../api'
import { PITCH_STATUS } from './labels'

const STEPS: PitchStatus[] = ['draft', 'submitted', 'in_review', 'panel_scheduled', 'evaluated']

/** Rascunho → Submetido → Em análise → Banca marcada → Avaliado → Selecionado / Não selecionado */
export function PitchStatusTrack({ status }: { status: PitchStatus }) {
  const final = status === 'selected' || status === 'not_selected'
  const effective = status === 'eligible' ? 'draft' : final ? 'evaluated' : status
  const idx = STEPS.indexOf(effective)
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs" aria-label="Etapas do pitch">
      {[...STEPS, final ? status : null].filter(Boolean).map((s, i) => {
        const done = i < idx || (final && i <= STEPS.length)
        const current = !final && i === idx
        const st = PITCH_STATUS[s as PitchStatus]
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className={cn('h-px w-4', done || current ? 'bg-primary' : 'bg-border')} />}
            <span className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium',
              current && 'border-primary bg-primary text-primary-foreground',
              done && !current && 'border-primary/40 text-primary',
              s === 'selected' && 'border-success bg-success text-success-foreground',
              s === 'not_selected' && 'border-destructive/40 text-destructive',
              !done && !current && 'text-muted-foreground')}>
              {done && s !== 'not_selected' && <Check className="h-3 w-3" />}
              {s === 'draft' && status === 'eligible' ? 'Elegível' : st.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
