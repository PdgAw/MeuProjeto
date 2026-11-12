/**
 * Typed access to public environment variables.
 * Only the anon (publishable) key may live in the browser — never the service role key.
 *
 * The NeoLevel project's public URL and anon key are built in as defaults, so the app works
 * even when `.env.local` is missing or malformed on a machine. The anon key is public by design
 * (it ships in every browser bundle); data access is enforced by Postgres RLS.
 * Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to point at another project.
 */
const DEFAULT_SUPABASE_URL = 'https://aoutklwhwkomvtlinxcq.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvdXRrbHdod2tvbXZ0bGlueGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0NDA5OTEsImV4cCI6MjExMDAxNjk5MX0.1I63OplApKz3U5ipvM7kfJmlMFJNGU2dop633nxTb_I'

const read = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

export const env = {
  supabaseUrl: read(import.meta.env.VITE_SUPABASE_URL) ?? DEFAULT_SUPABASE_URL,
  supabaseAnonKey: read(import.meta.env.VITE_SUPABASE_ANON_KEY) ?? DEFAULT_SUPABASE_ANON_KEY,
  appUrl: read(import.meta.env.VITE_APP_URL) ?? window.location.origin,
}

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
