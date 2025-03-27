'use client';

import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) router.push('/');
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        <button onClick={() => router.push('/cadastrar-atendimento')}>
          Cadastrar Atendimento
        </button>
        <button onClick={() => router.push('/consultar-atendimentos')}>
          Consultar Atendimentos
        </button>
        <button onClick={() => router.push('/relatorios')}>Relatórios</button>
        <button onClick={() => router.push('/cadastrar-cin')}>
          Cadastrar CIN
        </button>
      </div>
      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}