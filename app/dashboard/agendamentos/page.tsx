"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';

interface Agendamento {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
  data: string;
  horario: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  created_at: string;
}

export default function AgendamentosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      fetchAgendamentos();
    }
  }, [user, router, currentPage]);

  const fetchAgendamentos = async () => {
    try {
      setLoading(true);
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data, error, count } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact' })
        .order('data', { ascending: true })
        .order('horario', { ascending: true })
        .range(start, end);

      if (error) throw error;

      setAgendamentos(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
      setError('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: Agendamento['status']) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Atualizar a lista de agendamentos
      setAgendamentos(agendamentos.map(ag => 
        ag.id === id ? { ...ag, status: newStatus } : ag
      ));
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError('Erro ao atualizar status do agendamento');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'Confirmado';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Agendamentos</h1>
        <p className="text-gray-600 mt-2">Gerencie os agendamentos da Sala Sensorial</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-3 text-left">Nome</th>
              <th className="px-6 py-3 text-left">CPF</th>
              <th className="px-6 py-3 text-left">Data</th>
              <th className="px-6 py-3 text-left">Horário</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {agendamentos.map((agendamento) => (
              <tr key={agendamento.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{agendamento.nome}</td>
                <td className="px-6 py-4">{agendamento.cpf}</td>
                <td className="px-6 py-4">{formatDate(agendamento.data)}</td>
                <td className="px-6 py-4">{formatTime(agendamento.horario)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(agendamento.status)}`}>
                    {getStatusLabel(agendamento.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={agendamento.status || 'pendente'}
                    onChange={(e) => handleStatusChange(agendamento.id, e.target.value as Agendamento['status'])}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex justify-center items-center space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-gray-600">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
} 