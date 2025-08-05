'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { FiHome, FiCalendar, FiUser, FiMenu, FiX, FiBell, FiLogOut, FiBarChart2, FiSettings, FiFileText } from 'react-icons/fi';

// Memoized navigation items to prevent re-renders
const DesktopNavItems = ({ onClose, pathname }: { onClose?: () => void, pathname?: string }) => (
  <>
    <Link
      href="/dashboard"
      className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl ${pathname === '/dashboard' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-200`}
      onClick={onClose}
    >
      <FiHome className="mr-2.5 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
      <span>Início</span>
    </Link>

    <Link
      href="/agendamento"
      className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl ${pathname === '/agendamento' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-200`}
      onClick={onClose}
    >
      <FiCalendar className="mr-2.5 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
      <span>Agendar</span>
    </Link>

    <Link
      href="/admin/agendamentos/hoje"
      className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl ${pathname?.includes('/admin/agendamentos/hoje') ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-200`}
      onClick={onClose}
    >
      <FiCalendar className="mr-2.5 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
      <span>Agenda de Hoje</span>
    </Link>

    <Link
      href="/dashboard/relatorios"
      className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl ${pathname?.includes('/dashboard/relatorios') ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-200`}
      onClick={onClose}
    >
      <FiBarChart2 className="mr-2.5 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
      <span>Relatórios</span>
    </Link>
  </>
);

export default function DashboardHeader() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pathname, setPathname] = useState<string>('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
    
    // Get current pathname
    setPathname(window.location.pathname);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  };

  // Memoize user display name to prevent unnecessary re-renders
  const userDisplayName = useMemo(() => getUserDisplayName(), [user]);
  const userInitial = useMemo(() => userDisplayName.charAt(0).toUpperCase(), [userDisplayName]);

  return (
    <header className="bg-white/90 backdrop-blur-md shadow-md fixed top-0 left-0 right-0 z-50 border-b border-gray-200/70">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          {/* Logo e navegação principal */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-2"
              >
                <span className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white px-4 py-1.5 rounded-xl text-lg font-bold shadow-sm">
                  Sala Sensorial / Alece
                </span>
              </Link>
            </div>

            {/* Navegação Desktop */}
            <nav className="hidden md:flex ml-8 space-x-2">
              <DesktopNavItems pathname={pathname} />
            </nav>
          </div>

          {/* Ações do usuário */}
          <div className="flex items-center space-x-4">
            {/* Botão de notificações */}
            <button className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors relative">
              <FiBell className="w-5 h-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>

            {/* Menu do usuário */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
                  {userInitial}
                </div>
              </button>

              {/* Dropdown do usuário */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userDisplayName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <FiLogOut className="mr-2" />
                    Sair
                  </button>
                </div>
              )}
            </div>

            {/* Botão do menu mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <FiX className="w-5 h-5" />
              ) : (
                <FiMenu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Informações do usuário */}
              <div className="px-3 py-3 border-b border-gray-100 mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-lg">
                    {userInitial}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{userDisplayName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
              </div>

              <DesktopNavItems onClose={() => setIsMobileMenuOpen(false)} />

              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-base font-medium rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-700"
              >
                <FiLogOut className="mr-3 w-5 h-5" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}