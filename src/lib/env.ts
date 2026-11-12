/**
 * Typed access to public environment variables.
 * Only the anon (publishable) key may live in the browser — never the service role key.
 */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  appUrl: (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin,
}

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
