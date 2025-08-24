'use client';

import DashboardNav from '@/components/DashboardHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <DashboardNav />
      <main className="pt-20 pb-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
