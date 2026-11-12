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

/** Project ref of an anon JWT (null when the value is not a readable JWT). */
function jwtRef(key: string): string | null {
  try {
    const parts = key.split('.')
    // HS256 signature = 32 bytes = 43 base64url chars; anything else is a damaged copy.
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return null
    const part = parts[1]
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='))
    const ref = (JSON.parse(json) as { ref?: unknown }).ref
    return typeof ref === 'string' ? ref : null
  } catch {
    return null
  }
}

/**
 * Accept a configured URL + key only when they are well formed and belong together;
 * a truncated or mismatched key in `.env.local` would otherwise fail every request
 * with "Invalid API key". Falls back to the built-in project.
 */
function resolveSupabase(): { url: string; key: string } {
  const url = read(import.meta.env.VITE_SUPABASE_URL)
  const key = read(import.meta.env.VITE_SUPABASE_ANON_KEY)
  const ref = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1]
  if (url && key) {
    if (key.startsWith('sb_publishable_') && /^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) return { url, key }
    if (ref ? jwtRef(key) === ref : jwtRef(key) !== null) return { url, key }
    console.warn('[NeoLevel] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY inválidos ou de projetos diferentes; usando a configuração padrão.')
  }
  return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY }
}

const supabaseConfig = resolveSupabase()

export const env = {
  supabaseUrl: supabaseConfig.url,
  supabaseAnonKey: supabaseConfig.key,
  appUrl: read(import.meta.env.VITE_APP_URL) ?? window.location.origin,
}

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
