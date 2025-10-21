'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * AdminGuard - Protege rotas que requerem permissões de administrador
 * Permite acesso para: superadmin, admin, atendente
 * Bloqueia: user e visitantes não autenticados
 */
export default function AdminGuard({ children }: AdminGuardProps) {
  const { role, loading, hasAccessToDashboard } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Se não tem acesso ao dashboard, redireciona
      if (!hasAccessToDashboard) {
        router.push('/');
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
        <p className="mt-6 text-gray-700 font-semibold text-lg animate-pulse">Verificando permissões...</p>
        <p className="mt-2 text-gray-500 text-sm">Aguarde enquanto validamos seu acesso</p>
      </div>
    );
  }

  // Se não tem permissão, não renderiza nada (o redirect já foi acionado)
  if (!hasAccessToDashboard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-rose-50 to-red-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-red-100 mb-6">
            <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-6">Você não tem permissão para acessar esta área.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 
