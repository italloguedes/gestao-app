'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { FiHome, FiCalendar, FiUser, FiMenu, FiX, FiLogOut, FiBarChart2, FiSettings, FiFileText, FiActivity } from 'react-icons/fi';
import { MdFingerprint } from 'react-icons/md';
import UserProfileModal from './UserProfileModal';
import UserSettingsModal from './UserSettingsModal';
import { registrarLog } from '@/lib/activity-log';

// Memoized navigation items to prevent re-renders - Modern Design
const DesktopNavItems = ({ onClose, pathname, role }: { onClose?: () => void, pathname?: string, role?: string }) => (
  <>
    <Link
      href="/dashboard"
      className={`group flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl ${pathname === '/dashboard' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-300 hover:scale-105`}
      onClick={onClose}
    >
      <FiHome className="mr-2.5 h-4 w-4 group-hover:scale-125 transition-transform duration-200" />
      <span>Início</span>
    </Link>

    <Link
      href="/dashboard/coleta-digitais"
      className={`group flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl ${pathname?.includes('/dashboard/coleta-digitais') ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-gray-700 hover:bg-amber-50 hover:text-amber-700'} transition-all duration-300 hover:scale-105`}
      onClick={onClose}
    >
      <MdFingerprint className="mr-2.5 h-4 w-4 group-hover:scale-125 transition-transform duration-200" />
      <span>Coleta de Digitais</span>
    </Link>

    <Link
      href="/agendamento"
      className={`group flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl ${pathname === '/agendamento' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-300 hover:scale-105`}
      onClick={onClose}
    >
      <FiCalendar className="mr-2.5 h-4 w-4 group-hover:scale-125 transition-transform duration-200" />
      <span>Agendar</span>
    </Link>

    <Link
      href="/admin/agendamentos/hoje"
      className={`group flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl ${pathname?.includes('/admin/agendamentos/hoje') ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-300 hover:scale-105`}
      onClick={onClose}
    >
      <FiCalendar className="mr-2.5 h-4 w-4 group-hover:scale-125 transition-transform duration-200" />
      <span>Agenda de Hoje</span>
    </Link>

    <Link
      href="/dashboard/relatorios"
      className={`group flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl ${pathname?.includes('/dashboard/relatorios') ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-300 hover:scale-105`}
      onClick={onClose}
    >
      <FiBarChart2 className="mr-2.5 h-4 w-4 group-hover:scale-125 transition-transform duration-200" />
      <span>Relatórios</span>
    </Link>

    <Link
      href="/admin/gestao"
      className={`group flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl ${pathname?.includes('/admin/gestao') ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-300 hover:scale-105`}
      onClick={onClose}
    >
      <FiSettings className="mr-2.5 h-4 w-4 group-hover:scale-125 transition-transform duration-200" />
      <span>Gestão</span>
    </Link>

    {role && ['superadmin', 'admin'].includes(role) && (
      <Link
        href="/dashboard/logs"
        className={`group flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl ${pathname?.includes('/dashboard/logs') ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'} transition-all duration-300 hover:scale-105`}
        onClick={onClose}
      >
        <FiActivity className="mr-2.5 h-4 w-4 group-hover:scale-125 transition-transform duration-200" />
        <span>Logs</span>
      </Link>
    )}
  </>
);

export default function DashboardHeader() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pathname, setPathname] = useState<string>('');
  const [sessionRemaining, setSessionRemaining] = useState<string>('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();
        if (userData) {
          setRole(userData.role);
        }
      }
    };
    checkUser();

    // Get current pathname
    setPathname(window.location.pathname);

    // Atualiza contador de tempo restante de sessão (3h a partir de session-expiry)
    const updateRemaining = () => {
      const expiryStr = localStorage.getItem('session-expiry');
      let expiry = expiryStr ? parseInt(expiryStr) : NaN;
      if (!expiry || Number.isNaN(expiry)) {
        // fallback: define para 3h a partir de agora e persiste
        expiry = Date.now() + 10800000;
        localStorage.setItem('session-expiry', String(expiry));
      }
      const diffMs = Math.max(0, expiry - Date.now());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setSessionRemaining(`${hours}h ${minutes}m`);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      if (user) {
        await registrarLog({
          action: 'logout',
          entity_type: 'session',
          description: 'Usuário realizou logout',
          user_id: user.id,
          user_email: user.email,
          user_role: role || undefined
        });
      }
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
    <header className="bg-white/95 backdrop-blur-lg shadow-lg fixed top-0 left-0 right-0 z-50 border-b-2 border-gray-200/50">
      <div className="w-full">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          {/* Logo e navegação principal */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 group"
              >
                <span className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 text-white px-5 py-2 rounded-2xl text-lg font-black shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                  Sala Sensorial / Alece
                </span>
              </Link>
            </div>

            {/* Navegação Desktop */}
            <nav className="hidden md:flex ml-8 space-x-2">
              <DesktopNavItems pathname={pathname} role={role} />
            </nav>
          </div>

          {/* Ações do usuário */}
          <div className="flex items-center space-x-4">
            {/* Menu do usuário */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 focus:outline-none group"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={userDisplayName}
                    className="w-10 h-10 rounded-xl object-cover shadow-md hover:shadow-lg transform hover:scale-110 transition-all duration-300 ring-2 ring-emerald-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold shadow-md hover:shadow-lg transform hover:scale-110 transition-all duration-300 ring-2 ring-emerald-200">
                    {userInitial}
                  </div>
                )}
              </button>

              {/* Dropdown do usuário */}
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 py-2 z-50 animate-fade-in">
                  <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center space-x-3">
                      {user?.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt={userDisplayName}
                          className="w-12 h-12 rounded-xl object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
                          {userInitial}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{userDisplayName}</p>
                        <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                        {sessionRemaining && (
                          <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Expira em: {sessionRemaining}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="py-2 px-2">
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all duration-200 group"
                    >
                      <div className="p-2 bg-emerald-100 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                        <FiUser className="h-4 w-4 text-emerald-700" />
                      </div>
                      Meu Perfil
                    </button>
                  </div>

                  <div className="border-t-2 border-gray-100 py-2 px-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                    >
                      <div className="p-2 bg-red-100 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                        <FiLogOut className="h-4 w-4 text-red-600" />
                      </div>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botão do menu mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {isMobileMenuOpen ? (
                <FiX className="w-6 h-6" />
              ) : (
                <FiMenu className="w-6 h-6" />
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
                  {user?.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={userDisplayName}
                      className="w-10 h-10 rounded-full object-cover bg-emerald-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-lg">
                      {userInitial}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{userDisplayName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {sessionRemaining && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        Expira em: {sessionRemaining}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DesktopNavItems onClose={() => setIsMobileMenuOpen(false)} pathname={pathname} role={role} />

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

      {/* Modal de Perfil */}
      <UserProfileModal
        show={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSuccess={() => {
          setShowProfileModal(false);
          // Recarregar dados do usuário se necessário
          const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
          };
          checkUser();
        }}
      />

    </header>
  );
}