import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Kpi({ icon, label, value, hint, tone, to }: { icon?: ReactNode; label: string; value: ReactNode; hint?: string; tone?: 'warn' | 'good'; to?: string }) {
  const body = (
    <div className={cn('h-full rounded-lg border bg-card p-4', to && 'transition-colors hover:border-primary/40')}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</p>
      <p className={cn('mt-1.5 font-display text-2xl font-semibold tabular-nums', tone === 'warn' && 'text-warning', tone === 'good' && 'text-success')}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}
