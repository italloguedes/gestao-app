"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { AUTH_CONFIG } from '@/lib/auth-config';
import { hasAccessToDashboard } from '@/lib/models/User';
import { SessionWarningModal } from '@/components/SessionWarningModal';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  ensureValidSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => { },
  refreshSession: async () => false,
  ensureValidSession: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [timeUntilAutoLogout, setTimeUntilAutoLogout] = useState(0);
  const router = useRouter();
  const refreshingRef = useRef<Promise<boolean> | null>(null);
  const expiryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isSessionValid = useCallback((session: any): boolean => {
    if (!session) return false;

    const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
    if (!expiresAt) return false;

    const now = Date.now();
    return expiresAt > now;
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (expiryCheckIntervalRef.current) {
        clearInterval(expiryCheckIntervalRef.current);
      }
      if (expiryCheckIntervalRef.current) {
        clearInterval(expiryCheckIntervalRef.current);
      }
      localStorage.removeItem('app-session');
      localStorage.removeItem('auth_login_timestamp');
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }, [router]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (refreshingRef.current) {
      console.log('Aguardando refresh de sessão em andamento...');
      return await refreshingRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.refreshSession();

        if (error || !session) {
          console.error('Falha ao renovar sessão:', error);
          return false;
        }

        setUser(session.user);
        console.log('Sessão renovada com sucesso');
        return true;
      } catch (error) {
        console.error('Erro ao renovar sessão:', error);
        return false;
      } finally {
        refreshingRef.current = null;
      }
    })();

    refreshingRef.current = refreshPromise;
    return await refreshPromise;
  }, []);

  const ensureValidSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session || !isSessionValid(session)) {
        const refreshed = await refreshSession();

        if (!refreshed) {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!isSessionValid(retrySession)) {
            console.warn('Sessão expirada e não foi possível renovar');
            await signOut();
            return false;
          }
        }

        const { data: { session: finalSession } } = await supabase.auth.getSession();
        return isSessionValid(finalSession);
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      const now = Date.now();
      const timeUntilExpiry = expiresAt ? expiresAt - now : null;

      if (timeUntilExpiry && timeUntilExpiry < 5 * 60 * 1000) {
        console.log('Sessão próxima da expiração, renovando preventivamente...');
        await refreshSession();
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        return isSessionValid(refreshedSession);
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      const { data: { session } } = await supabase.auth.getSession();
      return isSessionValid(session);
    }
  }, [refreshSession, signOut, isSessionValid]);

  const handleRenewSession = useCallback(async () => {
    setShowSessionWarning(false);
    localStorage.setItem('auth_login_timestamp', Date.now().toString());
    await refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);

          // Inicializar timestamp de login se não existir
          if (!localStorage.getItem('auth_login_timestamp')) {
            localStorage.setItem('auth_login_timestamp', Date.now().toString());
          }

          const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
          const now = Date.now();
          const timeUntilExpiry = expiresAt ? expiresAt - now : null;

          if (timeUntilExpiry && timeUntilExpiry < 5 * 60 * 1000) {
            await refreshSession();
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    if (expiryCheckIntervalRef.current) {
      clearInterval(expiryCheckIntervalRef.current);
    }

    expiryCheckIntervalRef.current = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const loginTimestampStr = localStorage.getItem('auth_login_timestamp');

      // Verificação de Timeout Hard (2 horas)
      if (loginTimestampStr) {
        const loginTimestamp = parseInt(loginTimestampStr);
        const now = Date.now();
        const sessionDuration = now - loginTimestamp;
        const timeRemaining = AUTH_CONFIG.SESSION_TIMEOUT - sessionDuration;

        // Se passou do tempo limite (2h)
        if (sessionDuration > AUTH_CONFIG.SESSION_TIMEOUT) {
          console.warn('Sessão excedeu o limite de 2 horas. Realizando logout forçado...');
          setShowSessionWarning(false);
          await signOut();
          return;
        }

        // Se está no período de aviso (últimos 10 min)
        if (sessionDuration > (AUTH_CONFIG.SESSION_TIMEOUT - AUTH_CONFIG.SESSION_WARNING_THRESHOLD)) {
          if (!showSessionWarning) {
            setShowSessionWarning(true);
          }
          setTimeUntilAutoLogout(timeRemaining);
        } else {
          if (showSessionWarning) {
            setShowSessionWarning(false);
          }
        }
      }

      if (!isSessionValid(session)) {
        console.error('Sessão inválida detectada no intervalo de background');
        const refreshed = await refreshSession();
        if (!refreshed) {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!isSessionValid(retrySession)) {
            console.error('Sessão expirou e não pôde ser renovada. Fazendo logout...');
            if (expiryCheckIntervalRef.current) {
              clearInterval(expiryCheckIntervalRef.current);
            }
            await signOut();
          }
        }
        return;
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      const now = Date.now();
      const timeUntilExpiry = expiresAt ? expiresAt - now : null;

      if (timeUntilExpiry && timeUntilExpiry < 5 * 60 * 1000) {
        console.log('Auto-renovando sessão próxima da expiração...');
        const refreshed = await refreshSession();
        if (!refreshed) {
          console.error('Falha ao renovar sessão no intervalo de background');
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!isSessionValid(retrySession)) {
            console.error('Sessão expirou durante refresh em background');
            if (expiryCheckIntervalRef.current) {
              clearInterval(expiryCheckIntervalRef.current);
            }
            await signOut();
          }
        }
      }
    }, 1000); // Verificação a cada segundo para o timer ficar preciso

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setUser(session?.user ?? null);

      if (_event === 'SIGNED_IN') {
        localStorage.setItem('auth_login_timestamp', Date.now().toString());
      }

      if (session?.user && window.location.pathname === '/' && _event === 'SIGNED_IN') {
        try {
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

          if (hasAccessToDashboard(userData.role)) {
            router.push('/dashboard');
          } else {
            router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
          }
        } catch (error) {
          console.error('Erro ao verificar permissões:', error);
          router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (expiryCheckIntervalRef.current) {
        clearInterval(expiryCheckIntervalRef.current);
      }
    };
  }, [refreshSession, router]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshSession, ensureValidSession }}>
      {children}
      <SessionWarningModal
        isOpen={showSessionWarning}
        onRenew={handleRenewSession}
        onLogout={signOut}
        expiresIn={timeUntilAutoLogout}
      />
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
}; 
