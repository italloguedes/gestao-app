"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  total: number;
  pendentes: number;
  emAndamento: number;
  concluidos: number;
  hoje: number;
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
    pendentes: 0,
    emAndamento: 0,
    concluidos: 0,
    hoje: 0,
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

      // Atendimentos pendentes
      const { count: pendentes } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' })
        .eq('status', 'pendente');

      // Atendimentos em andamento
      const { count: emAndamento } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' })
        .eq('status', 'em_andamento');

      // Atendimentos concluídos
      const { count: concluidos } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' })
        .eq('status', 'concluido');

      // Atendimentos de hoje
      const { count: hoje } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact' })
        .eq('dia_atual', today);

      // Buscar atendimentos recentes
      const { data: recent } = await supabase
        .from('atendimentos')
        .select('*')
        .order('dia_atual', { ascending: false })
        .limit(5);

      setStats({
        total: total || 0,
        pendentes: pendentes || 0,
        emAndamento: emAndamento || 0,
        concluidos: concluidos || 0,
        hoje: hoje || 0,
      });

      setRecentAtendimentos(recent || []);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'text-yellow-600 bg-yellow-50';
      case 'em_andamento':
        return 'text-blue-600 bg-blue-50';
      case 'concluido':
        return 'text-green-600 bg-green-50';
      case 'cancelado':
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">Bem-vindo ao painel de controle</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Total de Atendimentos</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Pendentes</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.pendentes}</p>
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
          <h3 className="text-sm font-medium text-gray-500">Hoje</h3>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.hoje}</p>
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
              href="/dashboard/atendimentos" 
              className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-0.5 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="relative rounded-[7px] bg-white p-4 transition-all duration-300 ease-out group-hover:bg-opacity-90">
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-800">Ver Todos os Atendimentos</span>
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
                    {atendimento.status || 'pendente'}
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