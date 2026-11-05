import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client for the backend.
 * Uses the SERVICE ROLE KEY - full DB access, bypasses RLS.
 * NEVER expose this key to the frontend.
 */

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    '[BEER MUSIC] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
    'Copy .env.example to .env and configure your Supabase credentials.'
  )
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export default supabaseAdmin
