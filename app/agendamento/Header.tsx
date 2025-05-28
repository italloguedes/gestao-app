
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export default function Header({ onOpenAgendamentos }: { onOpenAgendamentos: () => void }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="w-full bg-emerald-700 text-white shadow flex items-center justify-between px-6 py-3 fixed top-0 left-0 z-50">
      <div className="font-bold text-lg tracking-wide">Sala Sensorial ALECE</div>
      <div className="flex items-center gap-4">
        {user && (
          <>
            <span className="hidden sm:inline text-sm font-medium">
              {user.user_metadata?.full_name || user.email}
            </span>
            <button
              className="bg-white text-emerald-700 px-3 py-1 rounded font-semibold hover:bg-emerald-100 transition"
              onClick={onOpenAgendamentos}
            >
              Meus Agendamentos
            </button>
            <button
              className="bg-red-600 text-white px-3 py-1 rounded font-semibold hover:bg-red-700 transition"
              onClick={handleLogout}
            >
              Sair
            </button>
          </>
        )}
      </div>
    </header>
  );
} 
