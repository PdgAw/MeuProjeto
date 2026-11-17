import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Kpi({ icon, label, value, hint, tone, to }: { icon?: ReactNode; label: string; value: ReactNode; hint?: string; tone?: 'warn' | 'good'; to?: string }) {
  const body = (
    <div className={cn('card-elev h-full rounded-lg border bg-card p-4 sm:p-5', to && 'transition-colors hover:border-primary/50')}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</p>
      <p className={cn('mt-2 font-display text-[1.75rem] font-bold leading-none tabular-nums text-foreground', tone === 'warn' && 'text-warning', tone === 'good' && 'text-success')}>{value}</p>
      {hint && <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}
