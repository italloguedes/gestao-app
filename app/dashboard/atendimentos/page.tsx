'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import { hasAccessToDashboard } from '@/lib/models/User';
import { toast } from '@/components/ui/use-toast';

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
}

export default function AtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  // Estados para o modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [editingAtendimento, setEditingAtendimento] = useState<Partial<Atendimento>>({});
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
      let query = supabase
        .from('atendimentos')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(
          `nome.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,protocolo.ilike.%${searchTerm}%,solicitante.ilike.%${searchTerm}%`
        );
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

  const formatTime = (timeString: string) => timeString.substring(0, 5);

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

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAtendimentos();
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
    setValidationErrors(prev => ({ ...prev, [field]: '' }));
    
    if (field === 'cpf') {
      const error = validateCPF(value);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [field]: error }));
      }
    }
    
    if (field === 'email') {
      const error = validateEmail(value);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [field]: error }));
      }
    }

    setEditingAtendimento(prev => ({
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
      
      // Notificação de processamento
      toast({
        title: "Salvando alterações",
        description: "Atualizando dados do atendimento...",
      });

      const { error } = await supabase
        .from('atendimentos')
        .update(editingAtendimento)
        .eq('id', selectedAtendimento.id);

      if (error) throw error;
      
      // Atualizar a lista de atendimentos
      setAtendimentos(prev => 
        prev.map(a => 
          a.id === selectedAtendimento.id 
            ? { ...a, ...editingAtendimento } 
            : a
        )
      );

      // Notificação de sucesso
      toast({
        title: "Atendimento atualizado",
        description: "Os dados foram salvos com sucesso!",
        variant: "success",
      });

      setShowEditModal(false);
      setSelectedAtendimento(null);
      setEditingAtendimento({});
      setValidationErrors({});
    } catch (err: any) {
      console.error('Erro ao salvar atendimento:', err);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um problema ao salvar as alterações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingAtendimento(selectedAtendimento || {});
    setValidationErrors({});
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
          <div className="relative flex gap-2">
            <input
  type="text"
  placeholder="Buscar por nome, protocolo ou CPF..."
  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }}
/>
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Buscar
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
                      <td className="px-6 py-4">{atendimento.protocolo}</td>
                      <td className="px-6 py-4">{atendimento.nome}</td>
                      <td className="px-6 py-4">{atendimento.cpf}</td>
                      <td className="px-6 py-4">{formatDate(atendimento.dia_atual)}</td>
                      <td className="px-6 py-4">{formatTime(atendimento.horario)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(atendimento.status)}`}>
                          {getStatusLabel(atendimento.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/atendimentos/${atendimento.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200 text-sm font-medium gap-1"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver
                          </Link>
                          <button
                            onClick={() => handleEditAtendimento(atendimento)}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors duration-200 text-sm font-medium gap-1"
                            title="Editar atendimento"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                        </div>
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
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de edição de atendimento */}
      {showEditModal && selectedAtendimento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative border border-emerald-100 max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
              onClick={() => {
                setShowEditModal(false);
                setSelectedAtendimento(null);
                setEditingAtendimento({});
                setValidationErrors({});
              }}
              aria-label="Fechar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      onChange={(e) => handleInputChange('protocolo', e.target.value)}
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
                  onChange={(e) => handleInputChange('observacoes' as keyof Atendimento, e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  placeholder="Observações sobre o atendimento..."
                />
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
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
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      )}
    </div>
  );
}
