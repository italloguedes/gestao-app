'use client';

import { useEffect, useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import { initializeDatabase } from '@/lib/models/User';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    setIsMounted(true);

    const init = async () => {
      try {
        // Timeout de 10 segundos para evitar requisições penduradas
        const timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('Database initialization timed out after 10s');
            abortController.abort();
          }
        }, 10000);

        const result = await initializeDatabase();
        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (!result.success) {
          console.error('Failed to initialize database:', result.error);
        }
      } catch (error) {
        if (!isMounted) return;
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Database initialization was aborted');
          return;
        }
        console.error('Error initializing database:', error);
      }
    };

    init();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <UserProvider>

        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </UserProvider>
    </AuthProvider>
  );
} 
