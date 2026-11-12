import { CheckCircle2, CircleDashed, Database, KeyRound, LayoutDashboard, Smartphone } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APP } from '@/config/terminology'
import { isSupabaseConfigured } from '@/lib/env'

/**
 * Temporary landing for Phase 0: shows that the foundation builds and whether
 * Supabase is wired. Replaced by the login + role dashboards in Phase 2/3.
 */
const PHASES = [
  { icon: LayoutDashboard, label: 'Fase 0 — Base do projeto', done: true },
  { icon: Database, label: 'Fase 1 — Banco de dados e RLS', done: false },
  { icon: KeyRound, label: 'Fase 2 — Autenticação e permissões', done: false },
  { icon: Smartphone, label: 'Fase 3 — Experiência do Neoleader', done: false },
]

export default function FoundationPage() {
  return (
    <div className="min-h-dvh bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-10 px-4 py-12">
        <Logo withCaption tone="light" />
        <div className="space-y-3">
          <Badge variant="accent">Em construção</Badge>
          <h1 className="text-3xl font-semibold sm:text-4xl">O sistema operacional da {APP.name}.</h1>
          <p className="max-w-xl text-sidebar-muted">{APP.tagline}</p>
        </div>

        <Card className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground">
          <CardHeader>
            <CardTitle>Roadmap de desenvolvimento</CardTitle>
            <CardDescription className="text-sidebar-muted">Cada fase é aprovada antes da próxima.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PHASES.map(({ icon: Icon, label, done }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <Icon className="h-4 w-4 text-sidebar-muted" />
                <span className="flex-1">{label}</span>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" aria-label="Concluída" />
                ) : (
                  <CircleDashed className="h-4 w-4 text-sidebar-muted" aria-label="Pendente" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-sidebar-muted">
          Supabase: {isSupabaseConfigured ? 'conectado via variáveis de ambiente' : 'aguardando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY'}
        </p>
      </div>
    </div>
  )
}
