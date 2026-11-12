import { ShieldAlert } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '../hooks/useAuth'

export default function NoAccessPage() {
  const [params] = useSearchParams()
  const { session, signOut } = useAuth()
  const byStatus = params.get('motivo') === 'status'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <ShieldAlert className="h-10 w-10 text-warning" />
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold">{byStatus ? 'Acesso indisponível' : 'Sem permissão'}</h1>
        <p className="text-muted-foreground">
          {byStatus
            ? 'Sua conta está inativa ou suspensa. Fale com a secretaria NeoLevel para reativar o acesso.'
            : 'Você não tem permissão para acessar esta área. Se achar que é um engano, fale com a coordenação.'}
        </p>
      </div>
      <div className="flex gap-3">
        {!byStatus && <Button asChild><Link to="/">Ir para o início</Link></Button>}
        {session && <Button variant="outline" onClick={() => void signOut()}>Sair</Button>}
      </div>
    </div>
  )
}
