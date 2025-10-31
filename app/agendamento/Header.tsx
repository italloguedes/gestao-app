
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { FiCalendar, FiUser, FiLogOut, FiMenu } from "react-icons/fi";

export default function Header({ onOpenAgendamentos }: { onOpenAgendamentos: () => void }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      setUser(user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="w-full bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 text-white shadow-lg border-b-2 border-emerald-800/20 fixed top-0 left-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Nome */}
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => router.push('/agendamento')}>
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 shadow-lg">
              <FiCalendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight group-hover:text-emerald-100 transition-colors">
                Sala Sensorial ALECE
              </h1>
              <p className="text-xs text-emerald-100/80 hidden sm:block">Agendamento de Atendimentos</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FiUser className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-white">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>

              {/* Meus Agendamentos Button */}
              <button
                className="group inline-flex items-center px-4 py-2.5 bg-white/90 hover:bg-white text-emerald-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-white/50"
                onClick={onOpenAgendamentos}
              >
                <FiCalendar className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                Meus Agendamentos
              </button>

              {/* Logout Button */}
              <button
                className="group inline-flex items-center px-4 py-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                onClick={handleLogout}
              >
                <FiLogOut className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                Sair
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          {user && (
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <FiMenu className="h-6 w-6 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {user && mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-slide-down">
            {/* User Info Mobile */}
            <div className="flex items-center space-x-3 px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                <FiUser className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>

            {/* Meus Agendamentos Mobile */}
            <button
              className="w-full flex items-center px-4 py-3 bg-white/90 text-emerald-700 rounded-xl font-semibold shadow-lg"
              onClick={() => {
                onOpenAgendamentos();
                setMobileMenuOpen(false);
              }}
            >
              <FiCalendar className="h-4 w-4 mr-2" />
              Meus Agendamentos
            </button>

            {/* Logout Mobile */}
            <button
              className="w-full flex items-center px-4 py-3 bg-red-500 text-white rounded-xl font-semibold shadow-lg"
              onClick={handleLogout}
            >
              <FiLogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 
