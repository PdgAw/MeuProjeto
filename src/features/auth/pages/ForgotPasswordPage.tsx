import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { requestPasswordReset } from '../api/auth'
import { AuthLayout } from '../components/AuthLayout'
import { emailSchema, type EmailValues } from '../schemas'

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null)
    try {
      await requestPasswordReset(email)
      setSentTo(email)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  })

  if (sentTo) {
    return (
      <AuthLayout title="Verifique seu e-mail">
        <div className="space-y-6">
          <div className="flex gap-3 rounded-lg border bg-card p-4 text-sm">
            <MailCheck className="h-5 w-5 shrink-0 text-success" />
            <p>
              Se <strong>{sentTo}</strong> tiver acesso à NeoLevel, você receberá um link para criar uma nova senha.
              O link expira em 1 hora.
            </p>
          </div>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/login"><ArrowLeft /> Voltar ao login</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Recuperar senha" description="Informe o e-mail cadastrado e enviaremos um link de redefinição.">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        <FormField id="email" label="E-mail" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus aria-invalid={Boolean(errors.email)} {...form.register('email')} />
        </FormField>
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Enviar link
        </Button>
        <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>
      </form>
    </AuthLayout>
  )
}
