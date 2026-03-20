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
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-50 via-white to-emerald-50/30">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-teal-200/20 blur-3xl" />
        <DashboardNav />
        <main className="relative z-10 pt-20 pb-6">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </DashboardGuard>
  );
}
