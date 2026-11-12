import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { signInWithPassword } from '../api/auth'
import { AuthLayout } from '../components/AuthLayout'
import { loginSchema, type LoginValues } from '../schemas'

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await signInWithPassword(values.email, values.password)
      // Only allow internal redirects.
      const next = params.get('next')
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  })

  return (
    <AuthLayout title="Entrar na NeoLevel" description="Acesso exclusivo para Neoleaders, Neomentores, professores e equipe.">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <FormField id="email" label="E-mail" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" autoFocus
            aria-invalid={Boolean(errors.email)} {...form.register('email')} />
        </FormField>
        <FormField
          id="password"
          label="Senha"
          error={errors.password?.message}
          action={
            <Link to="/esqueci-senha" className="text-xs font-medium text-primary hover:underline">
              Esqueci minha senha
            </Link>
          }
        >
          <Input id="password" type="password" autoComplete="current-password"
            aria-invalid={Boolean(errors.password)} {...form.register('password')} />
        </FormField>
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />}
          Entrar
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Ainda não tem acesso? O cadastro é feito por convite da NeoLevel.
        </p>
      </form>
    </AuthLayout>
  )
}
