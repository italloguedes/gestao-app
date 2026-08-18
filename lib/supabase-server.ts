import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase para uso no servidor (API Routes)
 * Usa SERVICE_ROLE_KEY que bypassa Row Level Security
 * IMPORTANTE: Nunca exponha este cliente no lado do cliente!
 * 
 * A inicialização é lazy para evitar erros durante o build do Next.js,
 * quando as variáveis de ambiente ainda não estão disponíveis.
 */

let _supabaseServer: any = null;

export function getSupabaseServer(): any {
  if (!_supabaseServer) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL não está definido');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não está definido');
    }
    _supabaseServer = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return _supabaseServer;
}

// Proxy para compatibilidade retroativa com rotas que usam `supabaseServer` diretamente
export const supabaseServer: any = new Proxy({}, {
  get(_target, prop) {
    const client = getSupabaseServer();
    const val = client[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  }
});
