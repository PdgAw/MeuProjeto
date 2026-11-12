import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import type { UserContext } from '../types'

/*
 * Auth data access. UI never talks to supabase.auth directly — it goes through here,
 * which keeps redirects and error translation in one place.
 */

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Seu acesso ainda não foi ativado. Use o link do convite enviado por e-mail.',
  'User is banned': 'Seu acesso está suspenso. Fale com a secretaria NeoLevel.',
  'New password should be different from the old password.': 'A nova senha precisa ser diferente da atual.',
  'Password should be at least 8 characters.': 'A senha precisa ter pelo menos 8 caracteres.',
  'For security purposes, you can only request this after': 'Aguarde alguns segundos antes de pedir outro e-mail.',
}

export function translateAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const match = Object.entries(AUTH_ERRORS).find(([key]) => message.startsWith(key))
  return match?.[1] ?? 'Não foi possível concluir agora. Tente novamente em instantes.'
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw new Error(translateAuthError(error))
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${env.appUrl}/redefinir-senha`,
  })
  // Never reveal whether the e-mail exists; only surface rate limits.
  if (error && error.message.startsWith('For security purposes')) throw new Error(translateAuthError(error))
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(translateAuthError(error))
}

/** Marks the account active and clears the forced password change flag. */
export async function completeFirstAccess() {
  const { error } = await supabase.rpc('complete_first_access')
  if (error) throw error
}

export async function fetchUserContext(): Promise<UserContext | null> {
  const { data, error } = await supabase.rpc('current_user_context')
  if (error) throw error
  return (data as unknown as UserContext | null) ?? null
}
