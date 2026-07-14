'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { hasAccessToDashboard, isAdmin, getUserRole, getUserName, type UserRole } from '@/lib/models/User';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardNav() {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState<number>(7200);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  useEffect(() => {
    setIsClient(true);
    const savedTime = localStorage.getItem('sessionTime');
    if (savedTime) {
      setSessionTime(parseInt(savedTime, 10));
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const timer = setInterval(() => {
      setSessionTime((prev: number) => {
        const newTime = prev - 1;
        localStorage.setItem('sessionTime', newTime.toString());
        if (newTime <= 0) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isClient]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('sessionTime');
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
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

        // Obter role e nome diretamente do user_metadata
        const userRole = getUserRole(session.user) as UserRole;
        const name = getUserName(session.user);

        const canAccessDashboard = hasAccessToDashboard(userRole);
        const isAdminRole = isAdmin(userRole);
        const isRecepcaoRole = userRole === 'recepcao';

        setIsAdminUser(isAdminRole);
        setHasAccess(canAccessDashboard || isRecepcaoRole);
        setUserName(name);

        // Recepcao só pode acessar a página de agendamentos hoje
        if (!canAccessDashboard && !isRecepcaoRole) {
          router.push('/');
        }

        setLoading(false);
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
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
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
  const isAgendamentosPage = pathname === '/dashboard/agendamentos';
  const isViagensPage = pathname.startsWith('/dashboard/viagens');
  const isColetaDigitaisPage = pathname === '/dashboard/coleta-digitais';

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 my-2 rounded-r-lg animate-in fade-in slide-in-from-top-2">
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
              <Link href="/dashboard" className="flex items-center space-x-2 group">
                <div className="relative w-8 h-8 transition-transform duration-300 group-hover:scale-110">
                  <Image
                    src="/logoautismo.png"
                    alt="Logo Sala Sensorial / ALECE"
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Sala Sensorial
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-1">
              <NavLink href="/dashboard" active={isHome}>Início</NavLink>
              {isAdminUser && (
                <>
                  <NavLink href="/admin/users" active={isUsersPage}>Gestão de Usuários</NavLink>
                  <NavLink href="/dashboard/agendamentos" active={isAgendamentosPage}>Gestão de Agendamentos</NavLink>
                  <NavLink href="/dashboard/viagens" active={isViagensPage}>Gestão de Viagens</NavLink>
                  <NavLink href="/dashboard/coleta-digitais" active={isColetaDigitaisPage}>Coleta de Digitais</NavLink>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors"
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
          <div className="hidden sm:flex items-center space-x-4">
            {isClient && (
              <div className="mr-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-700 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {formatTime(sessionTime)}
              </div>
            )}
            <div className="flex items-center pl-4 border-l border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center border-2 border-white shadow-sm">
                  <span className="text-emerald-700 font-semibold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-700">{userName}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Sair"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-100 animate-in slide-in-from-top-5">
          <div className="pt-2 pb-3 space-y-1 px-2">
            <MobileNavLink href="/dashboard" active={isHome}>Início</MobileNavLink>
            {isAdminUser && (
              <>
                <MobileNavLink href="/admin/users" active={isUsersPage}>Gestão de Usuários</MobileNavLink>
                <MobileNavLink href="/dashboard/agendamentos" active={isAgendamentosPage}>Gestão de Agendamentos</MobileNavLink>
                <MobileNavLink href="/dashboard/viagens" active={isViagensPage}>Gestão de Viagens</MobileNavLink>
                <MobileNavLink href="/dashboard/coleta-digitais" active={isColetaDigitaisPage}>Coleta de Digitais</MobileNavLink>
              </>
            )}
          </div>
          <div className="pt-4 pb-4 border-t border-gray-100 bg-gray-50/50">
            <div className="px-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-white shadow-sm">
                  <span className="text-emerald-600 font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-semibold text-gray-900">{userName}</div>
                  <div className="text-xs text-emerald-600 font-medium">
                    Sessão: {formatTime(sessionTime)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
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

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-4 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${active
        ? 'border-emerald-500 text-emerald-700'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'
        }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${active
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
      {children}
    </Link>
  );
}
