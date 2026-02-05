'use client';

import DashboardNav from '@/components/DashboardHeader';
import DashboardGuard from '@/components/DashboardGuard';

/**
 * DashboardLayout - Layout principal do dashboard
 * Protegido com DashboardGuard - requer permissões de dashboard
 * Permite acesso para: superadmin, admin, atendente
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div className="min-h-screen bg-gray-100">
        <DashboardNav />
        <main className="pt-20 pb-6">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </DashboardGuard>
  );
}
