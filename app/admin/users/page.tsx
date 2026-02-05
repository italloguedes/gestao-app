'use client';

import UserList from '@/components/UserList';
import { FiUsers, FiShield, FiUserCheck, FiUser } from 'react-icons/fi';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Premium Header with Glassmorphism */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-8 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              {/* Animated Accent Bar */}
              <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-full mb-6 animate-pulse"></div>

              {/* Title Section */}
              <div className="flex items-center gap-5 mb-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50 transform hover:scale-105 transition-transform duration-300">
                  <FiUsers className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                    Gestão de Usuários
                  </h1>
                  <p className="mt-2 text-slate-500 font-medium">
                    Administre permissões e acessos do sistema com segurança
                  </p>
                </div>
              </div>

              {/* Stats / Badges */}
              <div className="flex flex-wrap gap-3 mt-2">
                <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                  <FiShield className="mr-1.5 h-3.5 w-3.5" />
                  Super Admin
                </div>
                <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <FiUserCheck className="mr-1.5 h-3.5 w-3.5" />
                  Administradores
                </div>
                <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  <FiUser className="mr-1.5 h-3.5 w-3.5" />
                  Atendentes
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8 sm:px-8">
        <UserList />
      </div>
    </div>
  );
} 
