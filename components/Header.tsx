"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

export default function Header() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors duration-200"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 