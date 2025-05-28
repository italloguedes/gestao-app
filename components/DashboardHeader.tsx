'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { FiCalendar, FiClock, FiHome, FiLogOut, FiMenu, FiUser, FiX, FiSettings, FiBell } from 'react-icons/fi';

interface User {
  id: string;
  email?: string;
  role?: string;
  user_metadata?: {
    full_name?: string;
  };
}

export default function DashboardHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();

        if (!error && userData) {
          setUser({ ...user, role: userData.role });
          setIsAdmin(userData.role === 'admin');
        }
      }
    } catch (err) {
      console.error('Erro ao verificar usuário:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuário';
  };

  return (
    <header className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          {/* Logo e navegação principal */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-2"
              >
                <span className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white px-3 py-1 rounded-lg text-xl font-bold">
                  CIADI
                </span>
              </Link>
            </div>

            {/* Navegação Desktop */}
            <nav className="hidden md:flex ml-8 space-x-1">
              <Link
                href="/dashboard"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-150"
              >
                <FiHome className="mr-2 group-hover:scale-110 transition-transform duration-150" />
                <span>Início</span>
              </Link>

              <Link
                href="/agendamento"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-150"
              >
                <FiCalendar className="mr-2 group-hover:scale-110 transition-transform duration-150" />
                <span>Agendar</span>
              </Link>

              {isAdmin && (
                <>
                  <Link
                    href="/admin/vagas"
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-150"
                  >
                    <FiClock className="mr-2 group-hover:scale-110 transition-transform duration-150" />
                    <span>Gestão de Vagas</span>
                  </Link>
                  <Link
                    href="/admin/users"
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-150"
                  >
                    <FiUser className="mr-2 group-hover:scale-110 transition-transform duration-150" />
                    <span>Usuários</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Área do usuário - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
                  {getUserDisplayName().charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">{getUserDisplayName()}</span>
              </button>

              {/* Menu do usuário */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-100">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <FiLogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Botão do menu mobile */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-150"
            >
              {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
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
                    {getUserDisplayName().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="flex items-center px-3 py-2 text-base font-medium rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FiHome className="mr-3 w-5 h-5" />
                Início
              </Link>

              <Link
                href="/agendamento"
                className="flex items-center px-3 py-2 text-base font-medium rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FiCalendar className="mr-3 w-5 h-5" />
                Agendar
              </Link>

              {isAdmin && (
                <>
                  <Link
                    href="/admin/vagas"
                    className="flex items-center px-3 py-2 text-base font-medium rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FiClock className="mr-3 w-5 h-5" />
                    Gestão de Vagas
                  </Link>
                  <Link
                    href="/admin/users"
                    className="flex items-center px-3 py-2 text-base font-medium rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FiUser className="mr-3 w-5 h-5" />
                    Usuários
                  </Link>
                </>
              )}

              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-base font-medium rounded-lg text-red-600 hover:bg-red-50"
                >
                  <FiLogOut className="mr-3 w-5 h-5" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 