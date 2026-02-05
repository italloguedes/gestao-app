import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

interface SessionStatus {
  isValid: boolean;
  expiresAt: number | null;
  timeUntilExpiry: number | null;
}

export function useSessionManager() {
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isValid: false,
    expiresAt: null,
    timeUntilExpiry: null,
  });
  const refreshingRef = useRef<Promise<boolean> | null>(null);
  const lastCheckRef = useRef<number>(0);

  const checkSessionValidity = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setSessionStatus({ isValid: false, expiresAt: null, timeUntilExpiry: null });
        return false;
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      const now = Date.now();
      const timeUntilExpiry = expiresAt ? expiresAt - now : null;

      const isValid = timeUntilExpiry !== null && timeUntilExpiry > 0;

      setSessionStatus({ isValid, expiresAt, timeUntilExpiry });
      lastCheckRef.current = now;

      return isValid;
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      setSessionStatus({ isValid: false, expiresAt: null, timeUntilExpiry: null });
      return false;
    }
  }, []);

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

        const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
        const now = Date.now();
        const timeUntilExpiry = expiresAt ? expiresAt - now : null;

        setSessionStatus({ 
          isValid: true, 
          expiresAt, 
          timeUntilExpiry 
        });

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
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckRef.current;

    if (timeSinceLastCheck < 5000 && sessionStatus.isValid) {
      return true;
    }

    const isCurrentlyValid = await checkSessionValidity();

    if (!isCurrentlyValid) {
      const refreshed = await refreshSession();
      
      if (!refreshed) {
        console.warn('Sessão expirada e não foi possível renovar. Redirecionando para login...');
        await supabase.auth.signOut();
        router.push('/?session_expired=true');
        return false;
      }

      return true;
    }

    if (sessionStatus.timeUntilExpiry && sessionStatus.timeUntilExpiry < 5 * 60 * 1000) {
      console.log('Sessão próxima da expiração, renovando preventivamente...');
      await refreshSession();
    }

    return true;
  }, [checkSessionValidity, refreshSession, router, sessionStatus]);

  const getValidToken = useCallback(async (): Promise<string | null> => {
    const isValid = await ensureValidSession();
    
    if (!isValid) {
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, [ensureValidSession]);

  useEffect(() => {
    checkSessionValidity();

    const interval = setInterval(() => {
      checkSessionValidity();

      if (sessionStatus.timeUntilExpiry && sessionStatus.timeUntilExpiry < 5 * 60 * 1000) {
        refreshSession();
      }
    }, 60000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, _session: any) => {
      if (_event === 'SIGNED_OUT' || _event === 'TOKEN_REFRESHED' || _event === 'SIGNED_IN') {
        checkSessionValidity();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [checkSessionValidity, refreshSession, sessionStatus.timeUntilExpiry]);

  return {
    sessionStatus,
    ensureValidSession,
    refreshSession,
    getValidToken,
    checkSessionValidity,
  };
}
