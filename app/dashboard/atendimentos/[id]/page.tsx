'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  usuario_id: string;
}

export default function AtendimentoDetalhesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const fetchAtendimento = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setAtendimento(data);
    } catch (error: unknown) {
      console.error('Erro ao buscar atendimento:', error);
      setMessage('Erro ao carregar atendimento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      fetchAtendimento();
    }
  }, [user, router, fetchAtendimento]);

  const handleStatusUpdate = async () => {
    if (!atendimento) return;
    
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('atendimentos')
        .update({ status })
        .eq('id', atendimento.id);

      if (error) throw error;

      setMessage('Status atualizado com sucesso!');
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      setMessage('Erro ao atualizar status: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5); // Retorna apenas HH:mm
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">Carregando informações...</p>
      </div>
    );
  }

  if (!atendimento) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">Atendimento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Detalhes do Atendimento</h1>
          <p className="text-gray-600 mt-2">Protocolo: {atendimento.protocolo}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Voltar
        </button>
      </div>

      <div className="card p-6">
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.includes('sucesso')
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            <p>{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Informações do Cliente</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Nome</label>
                <p className="mt-1">{atendimento.nome}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">CPF</label>
                <p className="mt-1">{atendimento.cpf}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">E-mail</label>
                <p className="mt-1">{atendimento.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Solicitante</label>
                <p className="mt-1">{atendimento.solicitante}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Informações do Atendimento</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Data</label>
                <p className="mt-1">{formatDate(atendimento.dia_atual)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Horário</label>
                <p className="mt-1">{formatTime(atendimento.horario)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 input"
                >
                  <option value="">Selecione um status</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating || status === atendimento.status}
                  className="btn-primary w-full"
                >
                  {updating ? 'Atualizando...' : 'Atualizar Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 