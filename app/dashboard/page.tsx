"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  total: number;
  correcoes: number;
  emAndamento: number;
  concluidos: number;
  bloqueados: number;
  hoje: number;
  agendamentosPendentes: number;
  agendamentosConfirmados: number;
  agendamentosCancelados: number;
}

interface Atendimento {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  solicitante: string;
  protocolo: string;
  dia_atual: string;
  horario: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    correcoes: 0,
    emAndamento: 0,
    concluidos: 0,
    bloqueados: 0,
    hoje: 0,
    agendamentosPendentes: 0,
    agendamentosConfirmados: 0,
    agendamentosCancelados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentAtendimentos, setRecentAtendimentos] = useState<Atendimento[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      fetchDashboardData();
    }
  }, [user, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Buscar estatísticas
      const today = new Date().toISOString().split('T')[0];
      
      // Total de atendimentos
      const { count: total } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' });

      // Atendimentos em correção
      const { count: correcoes } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' })
        .eq('status', 'correcao');

      // Atendimentos em andamento
      const { count: emAndamento } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' })
        .eq('status', 'em_andamento');

      // Atendimentos concluídos
      const { count: concluidos } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' })
        .in('status', ['concluido', 'concluído', 'Concluido', 'Concluído']);

      // Atendimentos bloqueados
      const { count: bloqueados } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' })
        .eq('status', 'bloqueado');

      // Atendimentos de hoje
      const { count: hoje } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' })
        .eq('dia_atual', today);

      // Agendamentos pendentes
      const { count: agendamentosPendentes } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact' })
        .eq('status', 'pendente');

      // Agendamentos confirmados
      const { count: agendamentosConfirmados } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact' })
        .eq('status', 'confirmado');

      // Agendamentos cancelados
      const { count: agendamentosCancelados } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact' })
        .eq('status', 'cancelado');

      // Buscar atendimentos recentes
      const { data: recent } = await supabase
        .from('atendimentos')
        .select('*')
        .order('dia_atual', { ascending: false })
        .order('horario', { ascending: false })
        .limit(5);

      setStats({
        total: total || 0,
        correcoes: correcoes || 0,
        emAndamento: emAndamento || 0,
        concluidos: concluidos || 0,
        bloqueados: bloqueados || 0,
        hoje: hoje || 0,
        agendamentosPendentes: agendamentosPendentes || 0,
        agendamentosConfirmados: agendamentosConfirmados || 0,
        agendamentosCancelados: agendamentosCancelados || 0,
      });

      setRecentAtendimentos(recent || []);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Split the date string to get the date part only
    const [datePart] = dateString.split('T');
    // Create a new date object using the date part only
    const date = new Date(datePart + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'text-yellow-600 bg-yellow-50';
      case 'em_andamento':
        return 'text-blue-600 bg-blue-50';
      case 'concluido':
        return 'text-green-600 bg-green-50';
      case 'correcao':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">Carregando informações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel de Controle</h1>
        <p className="text-gray-600 mt-2">Bem-vindo ao gerenciamento de atendimentos.</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Total de Atendimentos</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Correções</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">{stats.correcoes}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Em Andamento</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.emAndamento}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Concluídos</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.concluidos}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Bloqueados</h3>
          <p className="mt-2 text-3xl font-bold text-gray-700">{stats.bloqueados}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Hoje</h3>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.hoje}</p>
        </div>
      </div>

      {/* Cards de Agendamentos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Agendamentos Pendentes</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.agendamentosPendentes}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Agendamentos Confirmados</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.agendamentosConfirmados}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Agendamentos Cancelados</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">{stats.agendamentosCancelados}</p>
        </div>
      </div>

      {/* Container para Ações Rápidas e Atendimentos Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ações Rápidas */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 relative inline-block">
            Ações Rápidas
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <Link 
              href="/dashboard/atendimentos/novo" 
              className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-0.5 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="relative rounded-[7px] bg-white p-4 transition-all duration-300 ease-out group-hover:bg-opacity-90">
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-800">Novo Atendimento</span>
                </div>
              </div>
            </Link>

            <Link 
              href="/dashboard/atendimentos/atualizar-cin" 
              className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-0.5 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="relative rounded-[7px] bg-white p-4 transition-all duration-300 ease-out group-hover:bg-opacity-90">
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-800">Atualizar CIN</span>
                </div>
              </div>
            </Link>

            <Link 
              href="/dashboard/atendimentos/correcoes" 
              className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500 to-pink-500 p-0.5 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="relative rounded-[7px] bg-white p-4 transition-all duration-300 ease-out group-hover:bg-opacity-90">
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-800">Ver Correções</span>
                </div>
              </div>
            </Link>

            <Link 
              href="/dashboard/atendimentos/cancelados" 
              className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-orange-500 to-red-500 p-0.5 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="relative rounded-[7px] bg-white p-4 transition-all duration-300 ease-out group-hover:bg-opacity-90">
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-800">Atendimentos Cancelados</span>
                </div>
              </div>
            </Link>

            <Link 
              href="/dashboard/atendimentos/bloqueados" 
              className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 p-0.5 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="relative rounded-[7px] bg-white p-4 transition-all duration-300 ease-out group-hover:bg-opacity-90">
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-800">Atendimentos Bloqueados</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Atendimentos Recentes */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 relative inline-block">
            Atendimentos Recentes
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          </h2>
          <div className="space-y-3">
            {recentAtendimentos.length === 0 ? (
              <p className="text-gray-500">Nenhum atendimento registrado</p>
            ) : (
              recentAtendimentos.map((atendimento) => (
                <div 
                  key={atendimento.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{atendimento.nome}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(atendimento.dia_atual)} - {atendimento.protocolo}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(atendimento.status)}`}>
                    {atendimento.status === 'correcao' ? 'Correção' : 
                     atendimento.status === 'concluido' ? 'Concluído' : 
                     atendimento.status === 'em_andamento' ? 'Em andamento' : 
                     atendimento.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/atendimentos"
          className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div>
            <span className="rounded-lg inline-flex p-3 bg-primary text-white ring-4 ring-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium">
              <span className="absolute inset-0" aria-hidden="true" />
              Atendimentos
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Gerencie os atendimentos da Sala Sensorial
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/relatorios"
          className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div>
            <span className="rounded-lg inline-flex p-3 bg-primary text-white ring-4 ring-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium">
              <span className="absolute inset-0" aria-hidden="true" />
              Relatórios
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Acesse e gere relatórios detalhados
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
