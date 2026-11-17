import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { SignalWaves } from '@/components/brand/SignalWaves'
import { APP } from '@/config/terminology'

interface AuthLayoutProps {
  title: string
  description?: ReactNode
  children: ReactNode
}

const STATS = [
  ['17–30', 'anos'],
  ['25', 'vagas por turma'],
  ['1.200', 'horas/aula'],
] as const

/** Split layout: brand panel like neolevel.com.br (desktop) + form. Mobile shows a compact brand header. */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.1fr_1fr]">
      <aside className="bg-brand-grid relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-neo/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy-950 to-transparent" />
        <SignalWaves className="pointer-events-none absolute -right-16 top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 text-neo opacity-[0.07]" />

        <Logo withCaption variant="negative" className="relative [&>img]:h-9" />

        <div className="relative max-w-lg space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-neo/30 bg-neo/10 px-3.5 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-neo">
            <span className="h-1.5 w-1.5 rounded-full bg-neo" /> Business School · FIESC
          </span>
          <h1 className="text-[2.75rem] font-bold leading-[1.08] text-white xl:text-5xl">
            A próxima geração de <span className="text-neo">líderes</span> está sendo formada aqui
          </h1>
          <p className="max-w-md text-[17px] leading-7 text-[#D9D9D9]">
            Sua jornada NeoLevel em um só lugar: aulas, Neomentoria, projeto empresarial e evolução como líder.
          </p>
          <dl className="flex gap-10 pt-2">
            {STATS.map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl font-bold tabular-nums text-neo">{value}</dd>
                <dd className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8C9AB3]">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative flex items-center gap-4 text-xs text-[#8C9AB3]">
          <img src="/brand/academia-fiesc-negativo.png" alt={APP.ecosystem} className="h-7 w-auto opacity-90" />
          <span className="h-6 w-px bg-white/15" />
          <span>{APP.city}</span>
        </div>
      </aside>

      <main className="relative flex flex-col">
        <div className="bg-brand-grid relative overflow-hidden bg-navy-950 px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] lg:hidden">
          <Logo withCaption variant="negative" className="[&>img]:h-7" />
          <p className="mt-6 font-display text-2xl font-bold leading-tight text-white">
            A próxima geração de <span className="text-neo">líderes</span>
          </p>
        </div>
        <div className="flex flex-1 items-start justify-center px-5 py-10 sm:px-8 lg:items-center">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2">
              <p className="eyebrow">Plataforma NeoLevel</p>
              <h2 className="text-[1.75rem] font-bold leading-tight">{title}</h2>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
