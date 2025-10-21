'use client';

import UserList from '@/components/UserList';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      {/* Modern Header with Gradient Bar */}
      <div className="bg-white border-b-2 border-gray-100 shadow-sm">
        <div className="px-6 py-8 sm:px-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Gradient Accent Bar */}
              <div className="h-1.5 w-24 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full mb-4 animate-pulse"></div>

              {/* Title with Icon */}
              <div className="flex items-center space-x-4 mb-3">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                    Gestão de Usuários
                  </h1>
                  <p className="mt-1.5 text-base text-gray-600">
                    Gerencie usuários, permissões e controle de acesso ao sistema
                  </p>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Super Admin
                </span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  Administradores
                </span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  Atendentes
                </span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                  Usuários
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 py-8 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <UserList />
        </div>
      </div>
    </div>
  );
} 
