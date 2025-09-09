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
        <div className="min-h-screen bg-gray-100">
          <DashboardNav />
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white shadow rounded-lg">
                {children}
              </div>
            </div>
          </div>
        </div>
      </SuperAdminGuard>
    </AdminGuard>
  );
} 
