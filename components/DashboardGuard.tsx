'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface DashboardGuardProps {
  children: React.ReactNode;
}

/**
 * DashboardGuard - Protege rotas do dashboard geral
 * Permite acesso para: superadmin, admin, atendente
 * Bloqueia: user (apenas acesso público) e visitantes não autenticados
 * Redireciona usuários não autorizados para /agendamento
 */
export default function DashboardGuard({ children }: DashboardGuardProps) {
  const { role, loading, hasAccessToDashboard, roleDisplayName } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Se não tem acesso ao dashboard, redireciona para área pública
      if (!hasAccessToDashboard) {
        router.push('/agendamento');
      }
    }
  }, [loading, hasAccessToDashboard, router]);

  // Mostra loading moderno enquanto verifica permissões
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-emerald-200"></div>
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-emerald-600 absolute top-0 left-0"></div>
        </div>
        <p className="mt-6 text-gray-700 font-semibold text-lg animate-pulse">Carregando Dashboard...</p>
        <p className="mt-2 text-gray-500 text-sm">Verificando suas permissões de acesso</p>
      </div>
    );
  }

  // Se não tem permissão, mostra mensagem antes de redirecionar
  if (!hasAccessToDashboard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center max-w-lg px-6">
          <div className="inline-flex items-center justify-center h-28 w-28 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-6 shadow-xl">
            <svg className="h-14 w-14 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-3">Acesso ao Dashboard Restrito</h2>

          <p className="text-gray-700 mb-2 font-semibold">
            Você não tem permissão para acessar o painel administrativo
          </p>

          {role && (
            <p className="text-gray-600 text-sm mb-6">
              Seu perfil atual: <span className="font-bold text-gray-800">{roleDisplayName}</span>
            </p>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6 text-left">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Para acessar o Dashboard você precisa de:
            </h3>
            <ul className="text-blue-800 text-sm space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Super Administrador</strong> - Acesso total ao sistema</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Administrador</strong> - Gerenciar atendimentos e relatórios</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Atendente</strong> - Visualizar e processar atendimentos</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/agendamento')}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:scale-105"
            >
              Ir para Agendamento
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
            >
              Voltar ao Início
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Se você acredita que deveria ter acesso, entre em contato com o administrador do sistema
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
