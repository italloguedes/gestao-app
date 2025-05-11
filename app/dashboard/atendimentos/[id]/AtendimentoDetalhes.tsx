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
    try {
      // Validar campos antes de salvar
      const errors: Record<string, string> = {};
      
      if (!editedAtendimento.nome?.trim()) {
        errors.nome = 'Nome é obrigatório';
      }
      
      if (!editedAtendimento.cpf?.trim()) {
        errors.cpf = 'CPF é obrigatório';
      } else {
        const cpfError = validateCPF(editedAtendimento.cpf);
        if (cpfError) errors.cpf = cpfError;
      }
      
      if (!editedAtendimento.email?.trim()) {
        errors.email = 'E-mail é obrigatório';
      } else {
        const emailError = validateEmail(editedAtendimento.email);
        if (emailError) errors.email = emailError;
      }
      
      if (!editedAtendimento.solicitante?.trim()) {
        errors.solicitante = 'Solicitante é obrigatório';
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      setLoading(true);
      const { error } = await supabase
        .from('atendimentos')
        .update(editedAtendimento)
        .eq('id', id);

      if (error) throw error;
      
      setAtendimento(prev => prev ? { ...prev, ...editedAtendimento } : null);
      setIsEditing(false);
      setValidationErrors({});
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
        <div className="flex gap-2">
          {isEditing && (
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedAtendimento(atendimento);
                setValidationErrors({});
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Cancelar
            </button>
          )}
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
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Excluir
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirmar Exclusão</h3>
            <p className="mb-6">Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

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
                disabled
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
              <div>
                <input
                  type="text"
                  value={editedAtendimento.nome || ''}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.nome ? 'border-red-500' : ''
                  }`}
                />
                {validationErrors.nome && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.nome}</p>
                )}
              </div>
            ) : (
              <p className="font-semibold">{atendimento.nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={editedAtendimento.cpf || ''}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.cpf ? 'border-red-500' : ''
                  }`}
                />
                {validationErrors.cpf && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.cpf}</p>
                )}
              </div>
            ) : (
              <p className="font-semibold">{atendimento.cpf}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            {isEditing ? (
              <div>
                <input
                  type="email"
                  value={editedAtendimento.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.email ? 'border-red-500' : ''
                  }`}
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                )}
              </div>
            ) : (
              <p className="font-semibold">{atendimento.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={editedAtendimento.solicitante || ''}
                  onChange={(e) => handleInputChange('solicitante', e.target.value)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.solicitante ? 'border-red-500' : ''
                  }`}
                />
                {validationErrors.solicitante && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.solicitante}</p>
                )}
              </div>
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
  );
} 