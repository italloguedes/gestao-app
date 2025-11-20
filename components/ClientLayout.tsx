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
    setIsMounted(true);
    const init = async () => {
      try {
        const result = await initializeDatabase();
        if (!result.success) {
          console.error('Failed to initialize database:', result.error);
        }
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };

    init();
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
