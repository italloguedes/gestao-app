'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserByAuthId, createUser, hasAccessToDashboard, isAdmin, type UserRole } from '@/lib/models/User';

export default function DashboardNav() {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setError(null);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          setError('Erro ao verificar sua sessão. Por favor, tente fazer login novamente.');
          setLoading(false);
          router.push('/');
          return;
        }

        if (!session) {
          router.push('/');
          setLoading(false);
          return;
        }

        if (!session.user?.id) {
          setError('ID do usuário não encontrado na sessão');
          setLoading(false);
          router.push('/');
          return;
        }

        try {
          console.log('Buscando usuário com auth_id:', session.user.id);
          const user = await getUserByAuthId(session.user.id);
          console.log('Resultado da busca de usuário:', user);
          
          if (!user) {
            console.log('Usuário não encontrado por auth_id, procurando por email:', session.user.email);
            const { data: existingUser, error: emailError } = await supabase
              .from('users')
              .select('*')
              .eq('email', session.user.email)
              .single();

            if (emailError && emailError.code !== 'PGRST116') {
              throw emailError;
            }

            if (existingUser) {
              console.log('Usuário encontrado por email, atualizando auth_id');
              const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({ auth_id: session.user.id })
                .eq('id', existingUser.id)
                .select()
                .single();

              if (updateError) throw updateError;
              if (updatedUser) {
                console.log('Auth_id atualizado com sucesso');
                const userRole = updatedUser.role as UserRole;
                const canAccessDashboard = hasAccessToDashboard(userRole);
                const isAdminRole = isAdmin(userRole);
                
                setIsAdminUser(isAdminRole);
                setHasAccess(canAccessDashboard);
                setUserName(updatedUser.name);

                if (!canAccessDashboard) {
                  router.push('/');
                }
                setLoading(false);
                return;
              }
            }

            console.log('Criando novo usuário');
            const userData = {
              auth_id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email || 'Usuário',
              email: session.user.email!,
              role: 'user' as const,
              status: 'active' as const
            };
            
            const newUser = await createUser(userData);
            setUserName(userData.name);
            console.log('Novo usuário criado como user comum');
            
            setHasAccess(false);
            router.push('/');
            setLoading(false);
            return;
          } else {
            console.log('Usuário encontrado, role:', user.role);
            const canAccessDashboard = hasAccessToDashboard(user.role);
            const isAdminRole = isAdmin(user.role);
            
            setIsAdminUser(isAdminRole);
            setHasAccess(canAccessDashboard);
            setUserName(user.name);

            if (!canAccessDashboard) {
              router.push('/');
            }
            setLoading(false);
          }
        } catch (userError) {
          console.error('Erro ao buscar usuário:', userError);
          setError('Erro ao carregar seu perfil de usuário');
          setLoading(false);
          router.push('/');
        }
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setError('Erro ao verificar suas permissões');
        setLoading(false);
        router.push('/');
      }
    };

    checkPermissions();
  }, [router]);

  if (loading) {
    return (
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-gray-500">Carregando...</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 my-2">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Sala Sensorial / Alece
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Início
              </Link>
              {isAdminUser && (
                <Link
                  href="/admin/users"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Gestão de Usuários
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 text-sm">{userName}</span>
            <button
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                  router.push('/');
                } catch (error) {
                  console.error('Erro ao fazer logout:', error);
                  setError('Erro ao fazer logout');
                }
              }}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 