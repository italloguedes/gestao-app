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
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-emerald-50/40">
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />

          <DashboardNav />

          <main className="relative z-10 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <section className="mb-5 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Administracao
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Painel de Usuarios
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Controle completo de acesso, perfis e governanca do sistema.
                </p>
              </section>

              <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-xl shadow-slate-200/50 backdrop-blur-sm sm:p-5">
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
      </SuperAdminGuard>
    </AdminGuard>
  );
}
