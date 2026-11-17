import { cn } from '@/lib/utils'

/**
 * The brand's graphic motif: the "o" of the logo with its signal waves.
 * Decorative only (empty states, loading, brand panels) — never an interface icon.
 */
export function SignalWaves({ className }: { className?: string }) {
  const arc = (r: number, a1: number, a2: number) => {
    const p = (a: number) => [60 + r * Math.cos((a * Math.PI) / 180), 60 + r * Math.sin((a * Math.PI) / 180)]
    const [x1, y1] = p(a1)
    const [x2, y2] = p(a2)
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  return (
    <svg viewBox="0 0 120 120" className={cn('text-primary', className)} aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="60" cy="60" r="20" strokeWidth="9" />
      <path d={arc(34, 237, 303)} strokeWidth="5" opacity="0.9" />
      <path d={arc(46, 240, 300)} strokeWidth="5" opacity="0.55" />
      <path d={arc(34, 57, 123)} strokeWidth="5" opacity="0.9" />
      <path d={arc(46, 60, 120)} strokeWidth="5" opacity="0.55" />
    </svg>
  )
}
