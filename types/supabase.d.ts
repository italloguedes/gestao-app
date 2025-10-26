import { SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    supabase: SupabaseClient;
  }
}

export interface User {
  id: string;
  email: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface AuthError {
  code?: string;
  message: string;
  status?: number;
}

export interface AuthResponse {
  data: {
    user: User | null;
    session: any | null;
  } | null;
  error: AuthError | null;
}

export interface AtendimentoObservacao {
  id: number;
  atendimento_id: number;
  observacao: string;
  usuario_email: string | null;
  usuario_nome: string | null;
  created_at: string;
}
