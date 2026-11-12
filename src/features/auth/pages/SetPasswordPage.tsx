import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/layout/PageLoader'
import { dashboardPath } from '@/config/dashboards'
import { firstName } from '@/lib/utils'
import { completeFirstAccess, fetchUserContext, updatePassword } from '../api/auth'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordFields } from '../components/PasswordFields'
import { useAuth } from '../hooks/useAuth'
import { newPasswordSchema, type NewPasswordValues } from '../schemas'

/**
 * Shared by two flows:
 *  - "first-access": invited user (or forced reset) defines their password and activates the account.
 *  - "reset": user arrived from the password recovery e-mail.
 */
export default function SetPasswordPage({ mode }: { mode: 'first-access' | 'reset' }) {
  const navigate = useNavigate()
  const { initializing, session, user, refreshUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  if (initializing) return <PageLoader />

  // The e-mail link creates the session; without it the link expired or was already used.
  if (!session) {
    return (
      <AuthLayout title="Link inválido ou expirado" description="Por segurança, os links de acesso valem por tempo limitado.">
        <div className="space-y-3">
          <Button className="w-full" asChild><Link to="/esqueci-senha">Receber um novo link</Link></Button>
          <Button variant="outline" className="w-full" asChild><Link to="/login">Ir para o login</Link></Button>
        </div>
      </AuthLayout>
    )
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null)
    try {
      await updatePassword(password)
      await completeFirstAccess()
      await refreshUser()
      const ctx = await fetchUserContext()
      toast.success(mode === 'first-access' ? 'Acesso ativado. Bem-vindo à NeoLevel!' : 'Senha atualizada.')
      navigate(dashboardPath(ctx?.dashboard), { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  })

  const name = firstName(user?.preferred_name || user?.full_name)
  const isFirst = mode === 'first-access'

  return (
    <AuthLayout
      title={isFirst ? `Bem-vindo${name ? `, ${name}` : ''}!` : 'Crie uma nova senha'}
      description={
        isFirst
          ? 'Este é seu primeiro acesso à plataforma NeoLevel. Defina uma senha pessoal para continuar.'
          : 'Escolha uma senha forte que você não use em outros serviços.'
      }
    >
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {error && <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        <PasswordFields form={form} />
        <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          {isFirst ? 'Ativar meu acesso' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthLayout>
  )
}
