import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  /** Show the "Business School" caption under the wordmark. */
  withCaption?: boolean
  /**
   * `negative`: white "level" for navy grounds (sidebar, brand panels) — the official logo.
   * `auto`: follows the theme (negative on dark, positive on light).
   * `symbol`: the "neo" mark with its signal waves only.
   */
  variant?: 'auto' | 'negative' | 'symbol'
}

/** Official NeoLevel logo files (see the brand manual, group "Logos"). Never redraw it. */
export function Logo({ className, withCaption = false, variant = 'auto' }: LogoProps) {
  if (variant === 'symbol') {
    return <img src="/brand/neolevel-simbolo.png" alt="NeoLevel" className={cn('h-7 w-auto', className)} />
  }
  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      <img
        src="/brand/neolevel-logo-negativo.png"
        alt="NeoLevel"
        width={473}
        height={126}
        className={cn('h-8 w-auto', variant === 'auto' && 'light:hidden')}
      />
      {variant === 'auto' && (
        <img src="/brand/neolevel-logo-positivo.png" alt="NeoLevel" width={473} height={126} className="hidden h-8 w-auto light:block" />
      )}
      {withCaption && (
        <span className={cn('pl-0.5 font-display text-[9px] font-bold uppercase tracking-[0.3em]', variant === 'negative' ? 'text-neo' : 'text-primary')}>
          Business School
        </span>
      )}
    </div>
  )
}
