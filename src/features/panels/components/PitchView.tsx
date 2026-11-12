import { ExternalLink, Presentation } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { stageLabel } from '@/config/labels'
import { fmtCurrency } from '@/lib/format'
import { openStoredFile } from '@/lib/storage'
import type { Pitch } from '../api'
import { PITCH_FIELDS } from './labels'

type PitchLike = Pick<Pitch, 'problem' | 'solution' | 'market' | 'business_model' | 'traction' | 'strategy' | 'team' | 'capital_use' | 'capital_needed' | 'pitch_deck_path' | 'venture'>

/** Read-only pitch for evaluators and coordination. */
export function PitchView({ pitch: p }: { pitch: PitchLike }) {
  const deck = p.pitch_deck_path ?? p.venture?.pitch_deck_path
  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
        <div>
          <p className="font-display text-xl font-semibold">{p.venture?.name}</p>
          <p className="text-sm text-muted-foreground">{p.venture?.owner?.full_name}{p.venture?.segment ? ` · ${p.venture.segment}` : ''}</p>
          {p.venture?.tagline && <p className="mt-1 text-sm">{p.venture.tagline}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.venture?.stage && <Badge>{stageLabel(p.venture.stage)}</Badge>}
          {p.capital_needed !== null && <Badge variant="secondary">Capital: {fmtCurrency(Number(p.capital_needed))}</Badge>}
          {deck && <button onClick={() => void openStoredFile('ventures', deck).catch((e) => toast.error(e.message))} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Presentation className="h-4 w-4" />Pitch deck</button>}
          {p.venture && <Link to={`/negocios/${p.venture.id}`} className="flex items-center gap-1 text-sm text-primary hover:underline">Negócio <ExternalLink className="h-3 w-3" /></Link>}
        </div>
      </CardContent></Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {PITCH_FIELDS.map(([k, l]) => (
          <Card key={k}><CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{l}</p>
            <p className="mt-1.5 whitespace-pre-line text-sm">{p[k] || <span className="text-muted-foreground">Não informado</span>}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  )
}
