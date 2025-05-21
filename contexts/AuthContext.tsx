"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { AUTH_CONFIG } from '@/lib/auth-config';
import { hasAccessToDashboard } from '@/lib/models/User';

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

  // Verifica se a sessão expirou
  const checkSessionExpiry = () => {
    const expiryTime = localStorage.getItem('session-expiry');
    if (expiryTime && parseInt(expiryTime) < Date.now()) {
      // Sessão expirou, faz logout
      signOut();
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Inicializa verificando a sessão atual
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        // Atualiza o timestamp de expiração se a sessão for válida
        localStorage.setItem('session-expiry', String(Date.now() + 7200000));
      }
      setLoading(false);
    };

    initializeAuth();

    // Verifica a expiração da sessão a cada minuto
    const interval = setInterval(checkSessionExpiry, 60000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (checkSessionExpiry()) return; // Se a sessão expirou, não faz nada

      setUser(session?.user ?? null);
      
      if (session?.user && window.location.pathname === '/') {
        try {
          // Busca o usuário no banco de dados
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('email', session.user.email)
            .single();

          if (userError) {
            console.error('Erro ao buscar dados do usuário:', userError);
            router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
            return;
          }

          // Verifica se o usuário tem acesso ao dashboard
          if (hasAccessToDashboard(userData.role)) {
            // Redireciona admin e atendente para a página de atendimentos
            router.push(AUTH_CONFIG.REDIRECT_URLS.ATENDIMENTOS);
          } else {
            // Para outros usuários, redireciona para o agendamento
            router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
          }
        } catch (error) {
          console.error('Erro ao verificar permissões:', error);
          // Em caso de erro, redireciona para o agendamento por padrão
          router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [router]);

  const signOut = async () => {
    try {
      localStorage.removeItem('session-expiry');
      localStorage.removeItem('app-session');
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
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
