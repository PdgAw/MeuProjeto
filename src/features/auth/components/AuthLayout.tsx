import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { APP } from '@/config/terminology'

interface AuthLayoutProps {
  title: string
  description?: ReactNode
  children: ReactNode
}

/** Split layout: brand panel (desktop) + form. Mobile shows a compact brand header. */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full bg-accent/10 blur-3xl"
        />
        <Logo withCaption tone="light" className="relative" />
        <div className="relative max-w-md space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Business School</p>
          <h1 className="text-4xl font-semibold leading-tight">
            O Neoleader está evoluindo como empreendedor e líder?
          </h1>
          <p className="text-sidebar-muted">
            Aprendizado, execução, mentoria, networking e resultados — sua jornada NeoLevel em um só lugar.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-muted">
          {APP.city} · {APP.ecosystem}
        </p>
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-5 sm:px-8 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{title}</h2>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
