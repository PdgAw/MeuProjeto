import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from './env'

/**
 * Single Supabase client for the whole app.
 * Authorization is enforced by Postgres RLS — the client never decides what a user may see.
 */
export const supabase = createClient<Database>(
  env.supabaseUrl ?? 'http://localhost:54321',
  env.supabaseAnonKey ?? 'public-anon-key-not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
