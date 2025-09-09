'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { FiSearch, FiFilter, FiDownload, FiCheck, FiX, FiPrinter } from 'react-icons/fi';
import DashboardHeader from '@/components/DashboardHeader';

interface Agendamento {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  data: string;
  horario: string;
  status: string;
  data_nascimento: string;
  created_at: string;
}

export default function AgendamentosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('confirmado');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAgendamentos();
    }
  }, [isAdmin, dateFilter, statusFilter]);

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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + 'T12:00:00Z');
      return date.toLocaleDateString('pt-BR', {
        timeZone: 'America/Fortaleza',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dateString;
    }
  };

  const loadAgendamentos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('agendamentos')
        .select('*')
        .order('data', { ascending: true })
        .order('horario', { ascending: true });

      if (dateFilter) {
        const adjustedDate = new Date(dateFilter);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        query = query.eq('data', adjustedDate.toISOString().split('T')[0]);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      await loadAgendamentos();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedItems.length) return;
    setActionLoading(true);

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('agendamentos')
          .delete()
          .in('id', selectedItems);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agendamentos')
          .update({ status: action })
          .in('id', selectedItems);

        if (error) throw error;
      }

      setSelectedItems([]);
      await loadAgendamentos();
    } catch (err) {
      console.error('Erro ao executar ação em lote:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'CPF', 'Telefone', 'Data', 'Horário', 'Status'];
    const csvData = agendamentos.map(a => [
      a.nome,
      a.email,
      a.cpf,
      a.telefone,
      formatDate(a.data),
      a.horario.slice(0, 5),
      a.status
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agendamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredAgendamentos = useMemo(() => 
    agendamentos.filter(a => 
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.cpf.includes(searchTerm)
    ),
    [agendamentos, searchTerm]
  );

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Agendamentos</h1>
              <p className="mt-2 text-gray-600">
                Gerencie todos os agendamentos do sistema
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/gestao')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
            >
              Voltar
            </button>
          </div>

          {/* Barra de ações */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex-1 min-w-[300px]">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, email ou CPF..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <FiFilter />
                    Filtros
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                    disabled={loading || actionLoading}
                  >
                    <FiDownload />
                    Exportar
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data
                      </label>
                      <input
                        type="date"
                        className="border rounded-lg px-3 py-2"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        className="border rounded-lg px-3 py-2"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="confirmado">Confirmado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="bloqueado">Bloqueado</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedItems.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {selectedItems.length} item(s) selecionado(s)
                    </span>
                    <button
                      onClick={() => handleBulkAction('confirmado')}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                      disabled={actionLoading}
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleBulkAction('cancelado')}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                      disabled={actionLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                      disabled={actionLoading}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lista de agendamentos */}
          {loading ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="animate-pulse">
                <div className="h-12 bg-gray-100"></div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-t border-gray-200">
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === filteredAgendamentos.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(filteredAgendamentos.map(a => a.id));
                            } else {
                              setSelectedItems([]);
                            }
                          }}
                          disabled={actionLoading}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAgendamentos.map((agendamento) => (
                      <tr key={agendamento.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(agendamento.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, agendamento.id]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== agendamento.id));
                              }
                            }}
                            disabled={actionLoading}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(agendamento.data)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {agendamento.horario.slice(0, 5)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {agendamento.nome}
                          </div>
                          <div className="text-sm text-gray-500">
                            CPF: {agendamento.cpf}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{agendamento.email}</div>
                          <div className="text-sm text-gray-500">{agendamento.telefone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${agendamento.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                              agendamento.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}`}
                          >
                            {agendamento.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusChange(agendamento.id, 'confirmado')}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title="Confirmar"
                              disabled={actionLoading}
                            >
                              <FiCheck />
                            </button>
                            <button
                              onClick={() => handleStatusChange(agendamento.id, 'cancelado')}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title="Cancelar"
                              disabled={actionLoading}
                            >
                              <FiX />
                            </button>
                            <button
                              onClick={() => window.open(`/admin/agendamentos/${agendamento.id}/imprimir`, '_blank')}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                              title="Imprimir"
                              disabled={actionLoading}
                            >
                              <FiPrinter />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 