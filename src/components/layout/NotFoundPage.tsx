import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { SignalWaves } from '@/components/brand/SignalWaves'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="bg-brand-grid flex min-h-dvh flex-col items-center justify-center gap-8 px-4 text-center">
      <Logo />
      <SignalWaves className="h-20 w-20 opacity-80" />
      <div className="space-y-2">
        <p className="eyebrow">Erro 404</p>
        <h1 className="text-3xl font-bold">Página não encontrada</h1>
        <p className="text-muted-foreground">Esse caminho não faz parte da sua jornada — ainda.</p>
      </div>
      <Button asChild size="lg">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
