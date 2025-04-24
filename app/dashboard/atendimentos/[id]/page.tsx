'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/app/components/Loading';

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

export default function AtendimentoDetalhesPage({ params }: { params: { id: string } }) {
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    fetchAtendimento();
  }, [user, params.id]);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('atendimentos')
        .update({ status: newStatus })
        .eq('id', params.id);

      if (error) throw error;
      
      setAtendimento(prev => prev ? { ...prev, status: newStatus } : null);
      setEditingStatus(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-red-600">Erro: {error}</div>;
  if (!atendimento) return <div>Atendimento não encontrado</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:text-blue-700 mb-4"
        >
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold">Detalhes do Atendimento</h1>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-gray-600">Protocolo</h2>
            <p className="font-semibold">{atendimento.protocolo}</p>
          </div>
          <div>
            <h2 className="text-gray-600">Status</h2>
            {editingStatus ? (
              <div className="flex gap-2">
                <select
                  className="border rounded px-2 py-1"
                  value={atendimento.status}
                  onChange={(e) => updateStatus(e.target.value)}
                >
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
                <button
                  onClick={() => setEditingStatus(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    atendimento.status === 'concluido'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {atendimento.status === 'concluido' ? 'Concluído' : 'Em andamento'}
                </span>
                <button
                  onClick={() => setEditingStatus(true)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Editar
                </button>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-gray-600">Nome do Cliente</h2>
            <p className="font-semibold">{atendimento.nome}</p>
          </div>
          <div>
            <h2 className="text-gray-600">CPF</h2>
            <p className="font-semibold">{atendimento.cpf}</p>
          </div>
          <div>
            <h2 className="text-gray-600">E-mail</h2>
            <p className="font-semibold">{atendimento.email}</p>
          </div>
          <div>
            <h2 className="text-gray-600">Solicitante</h2>
            <p className="font-semibold">{atendimento.solicitante}</p>
          </div>
          <div>
            <h2 className="text-gray-600">Data</h2>
            <p className="font-semibold">{formatDate(atendimento.dia_atual)}</p>
          </div>
          <div>
            <h2 className="text-gray-600">Horário</h2>
            <p className="font-semibold">{formatTime(atendimento.horario)}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 