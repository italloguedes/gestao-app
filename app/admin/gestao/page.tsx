'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { FiCalendar, FiClock, FiUsers, FiLock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import DashboardHeader from '@/components/DashboardHeader';
import { ReactNode } from 'react';

interface DashboardCard {
  title: string;
  description: string;
  icon: ReactNode;
  stats?: string;
  link: string;
  color: string;
}

export default function GestaoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalAgendamentos: 0,
    agendamentosHoje: 0,
    vagasBloqueadas: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    loadStats();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();

        if (userError) {
          console.error('Erro ao verificar permissões:', userError);
          setIsAdmin(false);
          return;
        }
        
        setIsAdmin(userData?.role === 'admin' || userData?.role === 'superadmin');
      }
    } catch (err) {
      console.error('Erro ao verificar usuário:', err);
      setIsAdmin(false);
    }
  };

  const loadStats = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      // Total de agendamentos confirmados
      const { data: totalAgendamentos } = await supabase
        .from('agendamentos')
        .select('count')
        .eq('status', 'confirmado');

      // Agendamentos para hoje
      const { data: agendamentosHoje } = await supabase
        .from('agendamentos')
        .select('count')
        .eq('data', hoje)
        .eq('status', 'confirmado');

      // Vagas bloqueadas
      const { data: vagasBloqueadas } = await supabase
        .from('agendamentos')
        .select('count')
        .eq('status', 'bloqueado');

      setStats({
        totalAgendamentos: totalAgendamentos?.[0]?.count || 0,
        agendamentosHoje: agendamentosHoje?.[0]?.count || 0,
        vagasBloqueadas: vagasBloqueadas?.[0]?.count || 0
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  const cards: DashboardCard[] = [
    {
      title: 'Gestão de Vagas',
      description: 'Gerencie a disponibilidade de horários e bloqueios',
      icon: <FiClock className="w-8 h-8" />,
      stats: `${stats.vagasBloqueadas} vagas bloqueadas`,
      link: '/admin/vagas',
      color: 'bg-emerald-500'
    },
    {
      title: 'Agendamentos',
      description: 'Visualize e gerencie todos os agendamentos',
      icon: <FiCalendar className="w-8 h-8" />,
      stats: `${stats.totalAgendamentos} agendamentos totais`,
      link: '/admin/agendamentos',
      color: 'bg-blue-500'
    },
    {
      title: 'Agendamentos de Hoje',
      description: 'Gerencie os agendamentos do dia',
      icon: <FiCheckCircle className="w-8 h-8" />,
      stats: `${stats.agendamentosHoje} agendamentos hoje`,
      link: '/admin/agendamentos/hoje',
      color: 'bg-orange-500'
    },
    {
      title: 'Consulta Pública',
      description: 'Link para consulta pública de documentos por CPF',
      icon: <FiUsers className="w-8 h-8" />,
      link: '/consulta',
      color: 'bg-purple-500'
    }
  ];

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
          <p className="mt-2 text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader />
      <div className="min-h-screen bg-gray-50 py-8 px-4 pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Gestão do Sistema</h1>
            <p className="mt-2 text-gray-600">
              Bem-vindo ao painel de gestão. Selecione uma das opções abaixo para começar.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                  <div className={`${card.color} p-4 text-white`}>
                    <div className="flex items-center justify-between">
                      {card.icon}
                      <h3 className="text-lg font-semibold">{card.title}</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 mb-4">{card.description}</p>
                    {card.stats && (
                      <p className="text-sm text-gray-500 mb-4">{card.stats}</p>
                    )}
                    <button
                      onClick={() => router.push(card.link)}
                      className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Acessar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
} 