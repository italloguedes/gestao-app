'use client';

import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/');
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="container">
      <h1>Gestão de Atendimentos Sala Sensorial / Alece</h1>
      <div className="button-group">
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
        <button onClick={() => router.push('/criar-postagem')}>
          Criar Postagem
        </button>
      </div>
      <button className="logout" onClick={handleLogout}>Sair</button>

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          text-align: center;
          background: #f3f4f6;
          border-radius: 10px;
          box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        }

        h1 {
          color: #008751;
          font-size: 24px;
          margin-bottom: 20px;
        }

        .button-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        button {
          background: #008751;
          color: white;
          border: none;
          padding: 12px 15px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s ease-in-out;
        }

        button:hover {
          background: #00663d;
        }

        .logout {
          background: #d9534f;
        }

        .logout:hover {
          background: #c9302c;
        }

        @media (min-width: 600px) {
          .button-group {
            flex-direction: row;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}