import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface InviteBody {
  email: string
  full_name: string
  role_key: string
  job_title?: string
  cohort_id?: string
  track?: string
  track_other_label?: string
  candidate_id?: string
}

/** Calls the invite-user Edge Function and surfaces its Portuguese error message. */
export async function inviteUser(body: InviteBody): Promise<{ user_id: string; email: string; role: string }> {
  const { data, error } = await supabase.functions.invoke('invite-user', { body })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null) as { error?: string; detail?: string } | null
      throw new Error(payload?.error ?? 'Falha ao enviar o convite.')
    }
    throw error
  }
  return data
}
