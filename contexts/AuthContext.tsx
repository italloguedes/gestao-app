"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user && window.location.pathname === '/') {
        try {
          // Busca o usuário no banco de dados
          const { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('email', session.user.email)
            .single();

          if (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            return;
          }

          // Se for admin, redireciona para o dashboard
          if (userData?.role === 'admin') {
            router.push('/dashboard');
          } else {
            // Para outros usuários, redireciona para o agendamento
            router.push('/agendamento');
          }
        } catch (error) {
          console.error('Erro ao verificar permissões:', error);
          // Em caso de erro, redireciona para o agendamento por padrão
          router.push('/agendamento');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
}; 