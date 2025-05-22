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
    if (!editedAtendimento) return;

    // Validate required fields
    const requiredFields: (keyof Atendimento)[] = ['nome', 'cpf', 'email', 'solicitante', 'protocolo', 'dia_atual', 'horario', 'status'];
    const newValidationErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      if (!editedAtendimento[field]) {
        newValidationErrors[field] = 'Este campo é obrigatório';
      }
    });

    if (Object.keys(newValidationErrors).length > 0) {
      setValidationErrors(newValidationErrors);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('atendimentos')
        .update(editedAtendimento)
        .eq('id', id);

      if (error) throw error;
      
      setAtendimento(editedAtendimento as Atendimento);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedAtendimento(atendimento || {});
    setValidationErrors({});
    setIsEditing(false);
  };

  const renderField = (label: string, field: keyof Atendimento, value: string) => {
    if (isEditing) {
      return (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <input
            type={field === 'email' ? 'email' : 'text'}
            value={editedAtendimento[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              validationErrors[field] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {validationErrors[field] && (
            <p className="text-red-500 text-sm mt-1">{validationErrors[field]}</p>
          )}
        </div>
      );
    }
    return (
      <p>
        <span className="font-medium">{label}:</span> {value}
      </p>
    );
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
          <div className="space-x-4">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Editar
              </button>
            ) : (
              <button
                onClick={handleCancelEdit}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Informações Pessoais</h2>
            <div className="space-y-3">
              {renderField('Nome', 'nome', atendimento.nome)}
              {renderField('CPF', 'cpf', atendimento.cpf)}
              {renderField('Email', 'email', atendimento.email)}
              {renderField('Solicitante', 'solicitante', atendimento.solicitante)}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Informações do Atendimento</h2>
            <div className="space-y-3">
              {renderField('Protocolo', 'protocolo', atendimento.protocolo)}
              {renderField('Data', 'dia_atual', formatDate(atendimento.dia_atual))}
              {renderField('Horário', 'horario', formatTime(atendimento.horario))}
              {isEditing ? (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editedAtendimento.status || ''}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="correcao">Correção</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              ) : (
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(atendimento.status)}`}>
                    {getStatusLabel(atendimento.status)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Excluir
          </button>
          {isEditing && (
            <button
              onClick={handleSave}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Salvar Alterações
            </button>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Confirmar exclusão</h3>
              <p className="mb-4">Tem certeza que deseja excluir este atendimento?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 