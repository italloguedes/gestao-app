'use client';

import DashboardNav from '@/components/DashboardHeader';
import AdminGuard from '@/components/AdminGuard';
import SuperAdminGuard from '@/components/SuperAdminGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <SuperAdminGuard>
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-50 via-white to-emerald-50/30">
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-teal-200/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-100/20 blur-3xl" />

          <DashboardNav />

          <main className="relative z-10 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </SuperAdminGuard>
    </AdminGuard>
  );
}
