'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import { hasAccessToDashboard } from '@/lib/models/User';

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

export default function AtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;
  const router = useRouter();
  const { user } = useAuth();

  // Efeito para autenticação e verificação de permissões
  useEffect(() => {
    const checkAuthAndPermissions = async () => {
      if (!user) {
        router.push('/');
        return;
      }

      try {
        // Busca o usuário e sua role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('email', user.email)
          .single();

        if (userError || !userData) {
          console.error('Erro ao buscar dados do usuário:', userError);
          router.push('/');
          return;
        }

        // Verifica se tem acesso ao dashboard
        if (!hasAccessToDashboard(userData.role)) {
          router.push('/agendamento');
          return;
        }

        // Se chegou aqui, tem permissão, então busca os atendimentos
        fetchAtendimentos();
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        router.push('/');
      }
    };

    checkAuthAndPermissions();
  }, [user, router]);

  // Debounce para o termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Efeito para buscar atendimentos
  useEffect(() => {
    fetchAtendimentos();
  }, [currentPage, debouncedSearchTerm]);

  const fetchAtendimentos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('atendimentos')
        .select('*', { count: 'exact' });

      if (debouncedSearchTerm) {
        query = query.or(`nome.ilike.%${debouncedSearchTerm}%,cpf.ilike.%${debouncedSearchTerm}%,protocolo.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error, count } = await query
        .order('dia_atual', { ascending: false })
        .order('horario', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;

      setAtendimentos(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Adiciona um listener para atualizações em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('atendimentos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atendimentos' }, () => {
        fetchAtendimentos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (dateString: string) => {
    const [datePart] = dateString.split('T');
    const date = new Date(datePart + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-100 text-green-800';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'correcao':
        return 'bg-red-100 text-red-800';
      case 'bloqueado':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'Concluído';
      case 'em_andamento':
        return 'Em andamento';
      case 'correcao':
        return 'Correção';
      case 'bloqueado':
        return 'Bloqueado';
      default:
        return status;
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="bg-white shadow-lg rounded-xl p-6 space-y-8">
        <div className="flex justify-between items-center pb-6 border-b border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Lista de Atendimentos</h1>
            <p className="text-gray-500 mt-2 text-lg">
              Total de {totalCount} atendimento{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/atendimentos/novo"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Registrar Atendimento
          </Link>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, protocolo ou CPF..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Protocolo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nome</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">CPF</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Data</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Horário</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {atendimentos.map((atendimento) => (
                    <tr key={atendimento.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                          {atendimento.protocolo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{atendimento.nome}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{atendimento.cpf}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{formatDate(atendimento.dia_atual)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{formatTime(atendimento.horario)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(atendimento.status)}`}>
                          {getStatusLabel(atendimento.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/atendimentos/${atendimento.id}`}
                          className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200 text-sm font-medium gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Próxima
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
