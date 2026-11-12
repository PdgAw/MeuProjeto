import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  /** Show the "Business School" caption next to the wordmark. */
  withCaption?: boolean
  tone?: 'dark' | 'light'
}

export function Logo({ className, withCaption = false, tone = 'dark' }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill={tone === 'light' ? '#F5F7FF' : '#0B1020'} />
        <path d="M18 46V18h6l16 18V18h6v28h-6L24 28v18z" fill={tone === 'light' ? '#0B1020' : '#F5F7FF'} />
        <rect x="40" y="12" width="12" height="4" rx="2" fill="#C8F25A" />
      </svg>
      <div className="leading-none">
        <span className="font-display text-lg font-bold tracking-tight">
          Neo<span className="text-primary">Level</span>
        </span>
        {withCaption && (
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em] opacity-60">
            Business School
          </span>
        )}
      </div>
    </div>
  )
}
