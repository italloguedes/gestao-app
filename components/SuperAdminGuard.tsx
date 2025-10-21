'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

/**
 * SuperAdminGuard - Protege rotas exclusivas do Super Administrador
 * Permite acesso APENAS para: superadmin
 * Bloqueia: admin, atendente, user e visitantes
 */
export default function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { role, loading, isSuperAdmin, roleDisplayName } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Se não é superadmin, redireciona para o dashboard
      if (!isSuperAdmin) {
        router.push('/dashboard');
      }
    }
  }, [loading, isSuperAdmin, router]);

  // Mostra loading moderno enquanto verifica permissões
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-red-200"></div>
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-red-600 absolute top-0 left-0"></div>
        </div>
        <p className="mt-6 text-gray-700 font-semibold text-lg animate-pulse">Verificando credenciais de Super Admin...</p>
        <p className="mt-2 text-gray-500 text-sm">Validando permissões administrativas</p>
      </div>
    );
  }

  // Se não é superadmin, mostra erro antes de redirecionar
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex items-center justify-center h-28 w-28 rounded-full bg-gradient-to-br from-red-100 to-orange-100 mb-6 shadow-xl">
            <svg className="h-14 w-14 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Acesso Restrito</h2>
          <p className="text-gray-700 mb-2 font-semibold">
            Esta área é exclusiva para Super Administradores
          </p>
          <p className="text-gray-600 text-sm mb-6">
            Seu perfil atual: <span className="font-bold text-gray-800">{roleDisplayName}</span>
          </p>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              🔐 Apenas usuários com privilégios de Super Administrador podem acessar o gerenciamento de usuários e configurações do sistema.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:scale-105"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
