import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase para uso no servidor (API Routes)
 * Usa SERVICE_ROLE_KEY que bypassa Row Level Security
 * IMPORTANTE: Nunca exponha este cliente no lado do cliente!
 */

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não está definido');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não está definido');
}

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);
