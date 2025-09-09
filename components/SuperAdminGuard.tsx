'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { isSuperAdmin } from '@/lib/models/User';
import Loading from './Loading';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export default function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSuperAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log('SuperAdminGuard - Usuário autenticado:', user?.id);
        
        if (!user) {
          console.log('SuperAdminGuard - Nenhum usuário autenticado, redirecionando para login');
          router.push('/');
          return;
        }

        // Busca o usuário na tabela users por auth_id primeiro
        let { data: userData, error } = await supabase
          .from('users')
          .select('role, auth_id, email')
          .eq('auth_id', user.id)
          .single();

        console.log('SuperAdminGuard - Busca por auth_id:', { userData, error });

        // Se não encontrou por auth_id, tenta por email
        if (error || !userData) {
          console.log('SuperAdminGuard - Não encontrado por auth_id, tentando por email');
          const { data: userByEmail, error: emailError } = await supabase
            .from('users')
            .select('role, auth_id, email')
            .eq('email', user.email)
            .single();

          console.log('SuperAdminGuard - Busca por email:', { userByEmail, emailError });

          if (emailError || !userByEmail) {
            console.error('SuperAdminGuard - Usuário não encontrado na tabela users:', emailError);
            router.push('/dashboard');
            return;
          }

          // Atualiza o auth_id se encontrou por email
          if (userByEmail && !userByEmail.auth_id) {
            console.log('SuperAdminGuard - Atualizando auth_id para usuário encontrado por email');
            const { error: updateError } = await supabase
              .from('users')
              .update({ auth_id: user.id })
              .eq('email', user.email);

            if (updateError) {
              console.error('SuperAdminGuard - Erro ao atualizar auth_id:', updateError);
            }
          }

          userData = userByEmail;
        }

        console.log('SuperAdminGuard - Dados do usuário:', userData);

        // Verifica se é superadmin
        if (isSuperAdmin(userData.role)) {
          console.log('SuperAdminGuard - Usuário autorizado como superadmin');
          setIsAuthorized(true);
        } else {
          console.log('SuperAdminGuard - Usuário não é superadmin, role:', userData.role);
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('SuperAdminGuard - Erro ao verificar permissões:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdminAccess();
  }, [router]);

  if (loading) {
    return <Loading />;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
