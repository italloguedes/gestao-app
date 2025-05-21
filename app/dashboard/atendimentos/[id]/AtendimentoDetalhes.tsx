'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchAtendimento();
  }, [user, router, id]);

  const fetchAtendimento = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Atendimento não encontrado');

      setAtendimento(data);
      setEditedAtendimento(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

    setEditedAtendimento(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!atendimento) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('atendimentos')
        .update({
          nome: atendimento.nome,
          cpf: atendimento.cpf,
          email: atendimento.email,
          solicitante: atendimento.solicitante,
          protocolo: atendimento.protocolo,
          dia_atual: atendimento.dia_atual,
          horario: atendimento.horario,
          status: atendimento.status
        })
        .eq('id', id);

      if (error) throw error;
      
      router.push('/dashboard/atendimentos');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('atendimentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      router.push('/dashboard/atendimentos');
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
      case 'cancelado':
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
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-red-600">Erro: {error}</div>;
  if (!atendimento) return <div>Atendimento não encontrado</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Detalhes do Atendimento</h1>
          <button
            onClick={() => router.back()}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
          >
            Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Informações Pessoais</h2>
            <div className="space-y-3">
              <p><span className="font-medium">Nome:</span> {atendimento.nome}</p>
              <p><span className="font-medium">CPF:</span> {atendimento.cpf}</p>
              <p><span className="font-medium">Email:</span> {atendimento.email}</p>
              <p><span className="font-medium">Solicitante:</span> {atendimento.solicitante}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Informações do Atendimento</h2>
            <div className="space-y-3">
              <p><span className="font-medium">Protocolo:</span> {atendimento.protocolo}</p>
              <p><span className="font-medium">Data:</span> {formatDate(atendimento.dia_atual)}</p>
              <p><span className="font-medium">Horário:</span> {formatTime(atendimento.horario)}</p>
              <p>
                <span className="font-medium">Status:</span>{' '}
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(atendimento.status)}`}>
                  {getStatusLabel(atendimento.status)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Excluir
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
} 