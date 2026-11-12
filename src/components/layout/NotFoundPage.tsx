import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-muted-foreground">Esse caminho não faz parte da sua jornada — ainda.</p>
      </div>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
