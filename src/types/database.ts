/**
 * Supabase database types.
 * This file is regenerated from the real schema with:
 *   npm run db:types
 * Until the schema exists (Phase 1), it holds an empty placeholder.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
