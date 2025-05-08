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