'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import { hasAccessToDashboard } from '@/lib/models/User';
import AtendimentoModal from '@/components/AtendimentoModal';
import FotosColetadasToggle from '@/components/FotosColetadasToggle';

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
  observacoes?: string;
  fotos_coletadas?: boolean;
}


export default function AtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fotosPendentes, setFotosPendentes] = useState(0);
  const itemsPerPage = 30;

  // Estados para o modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [editingAtendimento, setEditingAtendimento] = useState<Partial<Atendimento>>({});
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);


  const router = useRouter();
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

      const atendimentosData = atendimentosResult.data || [];
      
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
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'em_andamento':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'correcao':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'bloqueado':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'cancelado':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'entregue':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmar':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    switch (status) {
      case 'concluido':
        return 'Concluído';
      case 'em_andamento':
        return 'Em andamento';
      case 'correcao':
        return 'Correção';
      case 'bloqueado':
        return 'Bloqueado';
      case 'cancelado':
        return 'Cancelado';
      case 'entregue':
        return 'Entregue';
      case 'pendente':
        return 'Pendente';
      case 'confirmar':
        return 'Confirmar';
      default:
        return status;
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

  // Funções para edição de atendimento
  const validateCPF = (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return 'CPF deve ter 11 dígitos';
    return null;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'E-mail inválido';
    return null;
  };

  const handleEditAtendimento = (atendimento: Atendimento) => {
    setSelectedAtendimento(atendimento);
    setEditingAtendimento(atendimento);
    setValidationErrors({});
    setShowEditModal(true);
  };

  const handleInputChange = (field: keyof Atendimento, value: string) => {
    setValidationErrors((prev: Record<string, string>) => ({ ...prev, [field]: '' }));
    
    if (field === 'cpf') {
      const error = validateCPF(value);
      if (error) {
        setValidationErrors((prev: Record<string, string>) => ({ ...prev, [field]: error }));
      }
    }
    
    if (field === 'email') {
      const error = validateEmail(value);
      if (error) {
        setValidationErrors((prev: Record<string, string>) => ({ ...prev, [field]: error }));
      }
    }

    setEditingAtendimento((prev: Partial<Atendimento>) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAtendimento = async () => {
    if (!selectedAtendimento || !editingAtendimento) return;

    // Validar campos obrigatórios
    const requiredFields: (keyof Atendimento)[] = ['nome', 'cpf', 'email', 'solicitante', 'protocolo', 'dia_atual', 'horario', 'status'];
    const newValidationErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      if (!editingAtendimento[field]) {
        newValidationErrors[field] = 'Este campo é obrigatório';
      }
    });

    if (Object.keys(newValidationErrors).length > 0) {
      setValidationErrors(newValidationErrors);
      return;
    }

    try {
      setSaving(true);
      

      const { error } = await supabase
        .from('atendimentos')
        .update(editingAtendimento)
        .eq('id', selectedAtendimento.id);

      if (error) throw error;
      
      // Atualizar a lista de atendimentos
      setAtendimentos((prev: Atendimento[]) => 
        prev.map((a: Atendimento) => 
          a.id === selectedAtendimento.id 
            ? { ...a, ...editingAtendimento } 
            : a
        )
      );


      setShowEditModal(false);
      setSelectedAtendimento(null);
      setEditingAtendimento({});
      setValidationErrors({});
    } catch (err: any) {
      console.error('Erro ao salvar atendimento:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingAtendimento(selectedAtendimento || {});
    setValidationErrors({});
  };

  const handleDeleteAtendimento = async () => {
    if (!selectedAtendimento) return;

    if (!confirm(`Tem certeza que deseja excluir o atendimento de ${selectedAtendimento.nome}?`)) {
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('atendimentos')
        .delete()
        .eq('id', selectedAtendimento.id);

      if (error) throw error;
      
      // Atualizar a lista de atendimentos
      setAtendimentos((prev: Atendimento[]) => 
        prev.filter((a: Atendimento) => a.id !== selectedAtendimento.id)
      );

      setShowEditModal(false);
      setSelectedAtendimento(null);
      setEditingAtendimento({});
      setValidationErrors({});
    } catch (err: any) {
      console.error('Erro ao excluir atendimento:', err);
      alert('Erro ao excluir atendimento. Tente novamente.');
    } finally {
      setSaving(false);
    }
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
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Modern Header com Gradiente */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-1.5 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Gestão de Atendimentos
              </h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Visualize e gerencie todos os atendimentos
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-2xl rounded-3xl border-2 border-gray-100 p-8 space-y-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 pb-8 border-b-2 border-gray-100">
            <div className="space-y-3">
              {/* Stats Pills Modernos */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-base font-bold text-gray-900">
                    {totalCount} atendimento{totalCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Contador de fotos pendentes */}
                <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  fotosPendentes > 0
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-800'
                    : 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-800'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-bold">
                    {fotosPendentes > 0 ? (
                      `${fotosPendentes} foto${fotosPendentes !== 1 ? 's' : ''} pendente${fotosPendentes !== 1 ? 's' : ''}`
                    ) : (
                      'Todas fotos coletadas'
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="group inline-flex items-center px-6 py-3.5 border-2 border-transparent text-sm font-bold rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100 relative overflow-hidden"
                title="Atualizar lista de atendimentos"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`}
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">
                  {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                </span>
              </button>
              <Link
                href="/dashboard/atendimentos/novo"
                className="group bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Novo Atendimento
              </Link>
            </div>
          </div>

        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, protocolo, CPF ou solicitante..."
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm text-slate-700 placeholder-slate-400"
              value={searchTerm}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Buscar
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {isRefreshing && (
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
              <svg className="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-emerald-700 font-medium">Atualizando lista de atendimentos...</span>
            </div>
          )}

          <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Protocolo</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">CPF</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Data/Hora</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Fotos</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {atendimentos.map((atendimento) => (
                    <tr key={atendimento.id} className="hover:bg-slate-50/50 transition-all duration-200 group">
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm font-semibold text-slate-800">
                          {atendimento.protocolo}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{atendimento.nome}</div>
                        <div className="text-sm text-slate-500">{atendimento.solicitante}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm text-slate-700">
                          {atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800">{formatDate(atendimento.dia_atual)}</div>
                        <div className="text-sm text-slate-500">{formatTime(atendimento.horario)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(atendimento.status)}`}>
                          {getStatusLabel(atendimento.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <FotosColetadasToggle
                            fotosColetadas={atendimento.fotos_coletadas || false}
                            onToggle={async () => {
                              await handleToggleFotosColetadas(atendimento.id, atendimento.fotos_coletadas || false);
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleEditAtendimento(atendimento)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          title="Editar atendimento"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg">
              Mostrando <span className="font-semibold text-slate-800">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-semibold text-slate-800">{Math.min(currentPage * itemsPerPage, totalCount)}</span> de <span className="font-semibold text-slate-800">{totalCount}</span> registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg font-medium">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Próxima
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Modal de edição de atendimento - Unificado */}
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
      {/* Modal antigo removido - agora usando AtendimentoModal unificado */}
      {false && showEditModal && selectedAtendimento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-3xl relative border border-white/20 max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-all duration-200 focus:outline-none"
              onClick={() => {
                setShowEditModal(false);
                setSelectedAtendimento(null);
                setEditingAtendimento({});
                setValidationErrors({});
              }}
              aria-label="Fechar"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center mb-6">
              <div className="bg-emerald-100 p-3 rounded-xl mr-4">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-emerald-700">Editar Atendimento</h2>
                <p className="text-sm text-gray-500">Protocolo: {selectedAtendimento.protocolo}</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Informações do Atendimento */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Dados do Atendimento
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={editingAtendimento.nome || ''}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                        validationErrors.nome ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Nome completo"
                    />
                    {validationErrors.nome && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.nome}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPF *
                    </label>
                    <input
                      type="text"
                      value={editingAtendimento.cpf || ''}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                        validationErrors.cpf ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="000.000.000-00"
                    />
                    {validationErrors.cpf && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.cpf}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      value={editingAtendimento.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                        validationErrors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="email@exemplo.com"
                    />
                    {validationErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Solicitante *
                    </label>
                    <input
                      type="text"
                      value={editingAtendimento.solicitante || ''}
                      onChange={(e) => handleInputChange('solicitante', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                        validationErrors.solicitante ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Nome do solicitante"
                    />
                    {validationErrors.solicitante && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.solicitante}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data do Atendimento *
                    </label>
                    <input
                      type="date"
                      value={editingAtendimento.dia_atual || ''}
                      onChange={(e) => handleInputChange('dia_atual', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                        validationErrors.dia_atual ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.dia_atual && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.dia_atual}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horário *
                    </label>
                    <input
                      type="time"
                      value={editingAtendimento.horario || ''}
                      onChange={(e) => handleInputChange('horario', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                        validationErrors.horario ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.horario && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.horario}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      value={editingAtendimento.status || ''}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                        validationErrors.status ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecione o status</option>
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluido">Concluído</option>
                      <option value="correcao">Correção</option>
                      <option value="bloqueado">Bloqueado</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="entregue">Entregue</option>
                    </select>
                    {validationErrors.status && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.status}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Protocolo *
                    </label>
                    <input
                      type="text"
                      value={editingAtendimento.protocolo || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('protocolo', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                        validationErrors.protocolo ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Número do protocolo"
                    />
                    {validationErrors.protocolo && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.protocolo}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Observações
                </h3>
                <textarea
                  value={(editingAtendimento as any).observacoes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('observacoes' as keyof Atendimento, e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  placeholder="Observações sobre o atendimento..."
                />
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-slate-200">
              <button
                onClick={handleDeleteAtendimento}
                disabled={saving}
                className="px-6 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Excluir Atendimento
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="px-6 py-3 bg-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-300 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  disabled={saving}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAtendimento}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
