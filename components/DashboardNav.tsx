'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserByAuthId, createUser, hasAccessToDashboard, isAdmin, type UserRole } from '@/lib/models/User';
import Image from 'next/image';

export default function DashboardNav() {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState(() => {
    // Tenta recuperar o tempo restante do localStorage
    const savedTime = localStorage.getItem('sessionTime');
    if (savedTime) {
      const timeLeft = parseInt(savedTime);
      // Se o tempo salvo já expirou, retorna 0
      if (timeLeft <= 0) return 0;
      return timeLeft;
    }
    // Se não houver tempo salvo, inicia com 2 horas
    return 7200;
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Salva o tempo inicial no localStorage quando o componente monta
    if (!localStorage.getItem('sessionTime')) {
      localStorage.setItem('sessionTime', '7200');
    }

    const timer = setInterval(() => {
      setSessionTime((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(timer);
          localStorage.removeItem('sessionTime');
          handleLogout();
          return 0;
        }
        const newTime = prevTime - 1;
        localStorage.setItem('sessionTime', newTime.toString());
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('sessionTime');
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setError('Erro ao fazer logout');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="animate-pulse h-8 w-8 rounded-full bg-gray-200"></div>
                <div className="animate-pulse h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const isHome = pathname === '/dashboard';
  const isUsersPage = pathname === '/admin/users';

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 my-2 rounded-r-lg">
            <div className="flex items-center">
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
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Image
                  src="/logoautismo.png"
                  alt="Logo Sala Sensorial / ALECE"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Sala Sensorial
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isHome
                    ? 'border-emerald-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Início
              </Link>
              {isAdminUser && (
                <Link
                  href="/admin/users"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isUsersPage
                      ? 'border-emerald-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Gestão de Usuários
                </Link>
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
            >
              <span className="sr-only">Abrir menu principal</span>
              {!isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>

          {/* Desktop user menu */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Sessão expira em: {formatTime(sessionTime)}
            </div>
            <div className="flex items-center px-4 py-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 font-medium text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">{userName}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/dashboard"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isHome
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              Início
            </Link>
            {isAdminUser && (
              <Link
                href="/admin/users"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isUsersPage
                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                Gestão de Usuários
              </Link>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-4 py-3 bg-gray-50 rounded-lg mx-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 font-medium">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-base font-medium text-gray-800">{userName}</div>
                    <div className="text-sm text-gray-500">
                      Sessão expira em: {formatTime(sessionTime)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
} 