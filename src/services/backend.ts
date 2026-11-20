import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * 'supabase' — real accounts, Postgres, RLS.
 * 'demo'     — no backend configured: a single local workspace stored in this
 *              browser only. Clearly labelled in the UI; never used when keys exist.
 */
export const backendMode: 'supabase' | 'demo' = url && anonKey ? 'supabase' : 'demo'

export const supabase: SupabaseClient | null =
  backendMode === 'supabase'
    ? createClient(url!, anonKey!, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null
