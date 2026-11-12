import { Check, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PASSWORD_RULES, type NewPasswordValues } from '../schemas'

/** New password + confirmation with live rule checklist. */
export function PasswordFields({ form }: { form: UseFormReturn<NewPasswordValues> }) {
  const [visible, setVisible] = useState(false)
  const password = form.watch('password') ?? ''
  const { errors } = form.formState

  return (
    <div className="space-y-4">
      <FormField id="password" label="Nova senha" error={errors.password?.message}>
        <div className="relative">
          <Input
            id="password"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            className="pr-10"
            {...form.register('password')}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </FormField>
      <ul className="grid gap-1.5 text-xs" aria-label="Requisitos da senha">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password)
          return (
            <li key={rule.id} className={cn('flex items-center gap-2', ok ? 'text-success' : 'text-muted-foreground')}>
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full border',
                  ok ? 'border-success bg-success text-success-foreground' : 'border-border',
                )}
              >
                {ok && <Check className="h-3 w-3" />}
              </span>
              {rule.label}
            </li>
          )
        })}
      </ul>
      <FormField id="confirm" label="Confirme a nova senha" error={errors.confirm?.message}>
        <Input
          id="confirm"
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirm)}
          {...form.register('confirm')}
        />
      </FormField>
    </div>
  )
}
