'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { getUserByAuthId, createUser, isAdmin } from '@/lib/models/User';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('AdminGuard - Sessão:', session?.user?.id);
        
        if (!session) {
          console.log('AdminGuard - Nenhuma sessão encontrada, redirecionando para login');
          router.push('/');
          return;
        }

        // Busca o usuário pelo auth_id
        let user = await getUserByAuthId(session.user.id);
        console.log('AdminGuard - Usuário encontrado por auth_id:', user);

        // Se o usuário não existe, cria um novo
        if (!user) {
          console.log('AdminGuard - Usuário não encontrado, criando novo usuário');
          const newUser = await createUser({
            auth_id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email || 'Usuário',
            email: session.user.email!,
            role: 'user',
            status: 'active'
          });
          user = newUser;
          console.log('AdminGuard - Novo usuário criado:', user);
        }

        // Verifica se o usuário é admin ou superadmin
        const hasAdminAccess = isAdmin(user.role);
        console.log('AdminGuard - Verificação de admin:', { role: user.role, hasAdminAccess });
        
        if (!hasAdminAccess) {
          console.log('AdminGuard - Usuário não tem permissão de admin, redirecionando');
          router.push('/');
          return;
        }

        console.log('AdminGuard - Usuário autorizado');
        setIsAuthorized(true);
      } catch (error) {
        console.error('AdminGuard - Erro ao verificar status de admin:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
} 
