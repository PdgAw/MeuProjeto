import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const emailSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
})
export type EmailValues = z.infer<typeof emailSchema>

export const PASSWORD_RULES = [
  { id: 'length', label: 'Pelo menos 8 caracteres', test: (v: string) => v.length >= 8 },
  { id: 'letter', label: 'Uma letra', test: (v: string) => /[A-Za-zÀ-ú]/.test(v) },
  { id: 'number', label: 'Um número', test: (v: string) => /\d/.test(v) },
] as const

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
      .refine((v) => PASSWORD_RULES.every((r) => r.test(v)), 'A senha precisa ter letras e números.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não coincidem.' })
export type NewPasswordValues = z.infer<typeof newPasswordSchema>
