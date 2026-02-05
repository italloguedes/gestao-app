'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import { hasAccessToDashboard } from '@/lib/models/User';
import AtendimentoModal, { Atendimento } from '@/components/AtendimentoModal';
import FotosColetadasToggle from '@/components/FotosColetadasToggle';
import { FiSearch, FiRefreshCw, FiPlus, FiFilter, FiUser, FiClock, FiFileText } from 'react-icons/fi';

export default function AtendimentosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fotosPendentes, setFotosPendentes] = useState(0);
  const itemsPerPage = 30;

  // Estados para o modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    const checkAuthAndPermissions = async () => {
      if (!user) {
        router.push('/');
        return;
      }

      try {
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

        if (!hasAccessToDashboard(userData.role)) {
          router.push('/agendamento');
          return;
        }

        fetchAtendimentos();
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        router.push('/');
      }
    };

    checkAuthAndPermissions();
  }, [user, router]);

  useEffect(() => {
    fetchAtendimentos();
  }, [currentPage]);

  const fetchAtendimentos = async () => {
    try {
      setLoading(true);

      // Query otimizada - apenas campos necessários
      let query = supabase
        .from('atendimentos')
        .select('id, nome, cpf, email, solicitante, protocolo, dia_atual, horario, status, fotos_coletadas', { count: 'exact' });

      if (searchTerm.trim()) {
        query = query.or(
          `nome.ilike.%${searchTerm.trim()}%,cpf.ilike.%${searchTerm.trim()}%,protocolo.ilike.%${searchTerm.trim()}%,solicitante.ilike.%${searchTerm.trim()}%`
        );
      }

      // Query única otimizada
      const atendimentosResult = await query
        .order('dia_atual', { ascending: false })
        .order('horario', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (atendimentosResult.error) throw atendimentosResult.error;

      const atendimentosData = (atendimentosResult.data || []) as unknown as Atendimento[];

      // Calcular fotos pendentes localmente (mais rápido)
      const fotosPendentesCount = atendimentosData.filter((a: Atendimento) => !a.fotos_coletadas).length;

      setAtendimentos(atendimentosData);
      setTotalCount(atendimentosResult.count || 0);
      setTotalPages(Math.ceil((atendimentosResult.count || 0) / itemsPerPage));
      setFotosPendentes(fotosPendentesCount);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };


  // Atalho de teclado para refresh (Ctrl + R ou F5)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);


  const formatDate = useCallback((dateString: string) => {
    const [datePart] = dateString.split('T');
    const date = new Date(datePart + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza'
    });
  }, []);

  const formatTime = useCallback((timeString: string) => timeString.substring(0, 5), []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20';
      case 'em_andamento':
        return 'bg-amber-100 text-amber-800 ring-1 ring-amber-600/20';
      case 'correcao':
        return 'bg-rose-100 text-rose-800 ring-1 ring-rose-600/20';
      case 'bloqueado':
        return 'bg-slate-100 text-slate-700 ring-1 ring-slate-600/20';
      case 'cancelado':
        return 'bg-gray-100 text-gray-600 ring-1 ring-gray-600/20';
      case 'entregue':
        return 'bg-blue-100 text-blue-800 ring-1 ring-blue-600/20';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20';
      case 'confirmar':
        return 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-600/20';
      default:
        return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20';
    }
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    switch (status) {
      case 'concluido': return 'Concluído';
      case 'em_andamento': return 'Em andamento';
      case 'correcao': return 'Correção';
      case 'bloqueado': return 'Bloqueado';
      case 'cancelado': return 'Cancelado';
      case 'entregue': return 'Entregue';
      case 'pendente': return 'Pendente';
      case 'confirmar': return 'Confirmar';
      default: return status;
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAtendimentos();
  };

  const handleSearchInputChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleEditAtendimento = (atendimento: Atendimento) => {
    setSelectedAtendimento(atendimento);
    setShowEditModal(true);
  };

  const handleToggleFotosColetadas = useCallback(async (atendimentoId: number, fotosColetadas: boolean) => {
    // Otimização: atualizar UI primeiro (otimistic update)
    const newFotosColetadas = !fotosColetadas;

    setAtendimentos((prev: Atendimento[]) =>
      prev.map((a: Atendimento) =>
        a.id === atendimentoId
          ? { ...a, fotos_coletadas: newFotosColetadas }
          : a
      )
    );

    setFotosPendentes((prev: number) => fotosColetadas ? prev + 1 : prev - 1);

    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({ fotos_coletadas: newFotosColetadas })
        .eq('id', atendimentoId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Erro ao atualizar status das fotos:', err);

      // Reverter mudanças em caso de erro
      setAtendimentos((prev: Atendimento[]) =>
        prev.map((a: Atendimento) =>
          a.id === atendimentoId
            ? { ...a, fotos_coletadas: fotosColetadas }
            : a
        )
      );

      setFotosPendentes((prev: number) => fotosColetadas ? prev - 1 : prev + 1);

      alert('Erro ao atualizar status das fotos. Tente novamente.');
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAtendimentos();
    } finally {
      // Feedback visual mais rápido
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8">

        {/* Header Premium */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative">
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Gestão de Atendimentos
              </span>
            </h1>
            <p className="text-slate-500 text-lg max-w-2xl">
              Gerencie filas, visualize status e controle o fluxo de atendimentos em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`group flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 shadow-sm transition-all duration-300 ${isRefreshing ? 'rotate-180' : ''}`}
              title="Atualizar lista"
            >
              <FiRefreshCw className={`w-5 h-5 transition-all ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <Link
              href="/dashboard/atendimentos/novo"
              className="group flex items-center gap-2.5 px-6 py-3.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-semibold shadow-lg shadow-slate-200 hover:shadow-emerald-200/50 hover:-translate-y-0.5 transition-all duration-300"
            >
              <FiPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Novo Atendimento</span>
            </Link>
          </div>

          {/* Background Decorative Gradient */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>
        </div>

        {/* Stats & Search Bar Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

          {/* Stats Cards */}
          <div className="lg:col-span-7 flex flex-wrap gap-4">
            <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <FiFileText className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-2xl font-bold text-slate-800">{totalCount}</span>
                <span className="text-sm font-medium text-slate-400">Total de Registros</span>
              </div>
            </div>

            <div className={`flex items-center gap-3 px-5 py-3 bg-white rounded-2xl shadow-sm border transition-all ${fotosPendentes > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'
              }`}>
              <div className={`p-2 rounded-xl ${fotosPendentes > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                <FiUser className="w-5 h-5" />
              </div>
              <div>
                <span className={`block text-2xl font-bold ${fotosPendentes > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                  {fotosPendentes}
                </span>
                <span className={`text-sm font-medium ${fotosPendentes > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  Fotos Pendentes
                </span>
              </div>
            </div>
          </div>

          {/* Modern Search Bar */}
          <div className="lg:col-span-5 w-full">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Buscar por protocolo, nome, CPF..."
                className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300"
                value={searchTerm}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button
                  onClick={handleSearch}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors text-xs font-semibold"
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-3 animate-fade-in text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}

        {/* Premium Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Protocolo</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Solicitação</th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Foto</th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {atendimentos.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <FiSearch className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-base font-medium">Nenhum atendimento encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  atendimentos.map((atendimento) => (
                    <tr
                      key={atendimento.id}
                      className="group hover:bg-emerald-50/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {atendimento.protocolo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
                            {atendimento.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-slate-900">{atendimento.nome}</div>
                            <div className="text-xs text-slate-500 font-mono">
                              {atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FiUser className="w-3 h-3" />
                            <span>{atendimento.solicitante}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FiClock className="w-3 h-3" />
                            <span>{formatDate(atendimento.dia_atual)} às {formatTime(atendimento.horario)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusColor(atendimento.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getStatusColor(atendimento.status).split(' ')[1].replace('text-', 'bg-')}`}></span>
                          {getStatusLabel(atendimento.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <FotosColetadasToggle
                            fotosColetadas={atendimento.fotos_coletadas || false}
                            onToggle={async () => {
                              await handleToggleFotosColetadas(atendimento.id, atendimento.fotos_coletadas || false);
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditAtendimento(atendimento)}
                          className="text-slate-400 hover:text-emerald-600 font-medium text-sm transition-colors p-2 hover:bg-emerald-50 rounded-lg"
                        >
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500 font-medium">
              Mostrando <span className="text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, totalCount)}</span> de <span className="text-slate-900">{totalCount}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <div className="hidden sm:flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // Simplistic logic for demonstration - ideally a robust pagination component
                  let pageNum = currentPage;
                  if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  if (pageNum <= 0 || pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${currentPage === pageNum
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && selectedAtendimento && (
        <AtendimentoModal
          atendimento={selectedAtendimento}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAtendimento(null);
          }}
          onUpdate={(updated) => {
            setAtendimentos(prev =>
              prev.map(a => a.id === updated.id ? updated : a)
            );
          }}
          onDelete={(id) => {
            setAtendimentos(prev => prev.filter(a => a.id !== id));
          }}
        />
      )}
    </div>
  );
}
