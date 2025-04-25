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

interface Props {
  id: string;
}

export default function AtendimentoDetalhes({ id }: Props) {
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAtendimento, setEditedAtendimento] = useState<Partial<Atendimento>>({});
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchAtendimento();
  }, [user, id]);

  const fetchAtendimento = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setAtendimento(data);
      setEditedAtendimento(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Atendimento, value: string) => {
    setEditedAtendimento(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('atendimentos')
        .update(editedAtendimento)
        .eq('id', id);

      if (error) throw error;
      
      setAtendimento(prev => prev ? { ...prev, ...editedAtendimento } : null);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      default:
        return status;
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-red-600">Erro: {error}</div>;
  if (!atendimento) return <div>Atendimento não encontrado</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center text-blue-500 hover:text-blue-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </button>
        <h1 className="text-2xl font-bold">Detalhes do Atendimento</h1>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`px-4 py-2 rounded-md ${
            isEditing 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isEditing ? 'Salvar' : 'Editar'}
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Protocolo</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedAtendimento.protocolo || ''}
                  onChange={(e) => handleInputChange('protocolo', e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="font-semibold">{atendimento.protocolo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              {isEditing ? (
                <select
                  value={editedAtendimento.status || ''}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="correcao">Correção</option>
                </select>
              ) : (
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(atendimento.status)}`}>
                  {getStatusLabel(atendimento.status)}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedAtendimento.nome || ''}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="font-semibold">{atendimento.nome}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedAtendimento.cpf || ''}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="font-semibold">{atendimento.cpf}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedAtendimento.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="font-semibold">{atendimento.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedAtendimento.solicitante || ''}
                  onChange={(e) => handleInputChange('solicitante', e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="font-semibold">{atendimento.solicitante}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedAtendimento.dia_atual?.split('T')[0] || ''}
                  onChange={(e) => handleInputChange('dia_atual', e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="font-semibold">{formatDate(atendimento.dia_atual)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
              {isEditing ? (
                <input
                  type="time"
                  value={editedAtendimento.horario || ''}
                  onChange={(e) => handleInputChange('horario', e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="font-semibold">{formatTime(atendimento.horario)}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 