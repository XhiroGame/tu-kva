import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for the frontend.
 * Uses the anon key (safe for browser use) + RLS policies for security.
 *
 * Environment variables (must be set in .env):
 *   VITE_SUPABASE_URL      → https://your-project-id.supabase.co
 *   VITE_SUPABASE_ANON_KEY → your-anon-key
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[BEER MUSIC] Missing Supabase environment variables. ' +
    'Copy .env.example to .env and fill in your project credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist admin session in localStorage
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export default supabase
