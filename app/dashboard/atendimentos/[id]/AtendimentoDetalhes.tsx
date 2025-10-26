'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import { AtendimentoObservacao } from '@/types/supabase';
import Loading from '@/components/Loading';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiClock,
  FiFileText,
  FiEdit,
  FiSave,
  FiX,
  FiTrash2,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiLock,
  FiSlash,
  FiMessageSquare,
  FiPlus,
  FiArrowLeft,
  FiCreditCard,
} from 'react-icons/fi';

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
  observacoes: string;
  atendente_nome?: string;
  usuario_id?: string;
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
  const [novaObservacao, setNovaObservacao] = useState('');
  const [addingObservacao, setAddingObservacao] = useState(false);
  const [historicoObservacoes, setHistoricoObservacoes] = useState<AtendimentoObservacao[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchCurrentUserName();
    fetchAtendimento();
    fetchObservacoes();
  }, [user, router, id]);

  const fetchCurrentUserName = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, email')
        .eq('auth_id', user.id)
        .single();

      if (!error && data) {
        setCurrentUserName(data.name);
        setCurrentUserEmail(data.email);
      }
    } catch (err) {
      console.error('Erro ao buscar nome do usuário:', err);
    }
  };

  const fetchObservacoes = async () => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      if (!token) return;

      const response = await fetch(`/api/atendimentos-observacoes?atendimento_id=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistoricoObservacoes(data);
      }
    } catch (err) {
      console.error('Erro ao buscar observações:', err);
    }
  };

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

  const handleAddObservacao = async () => {
    if (!novaObservacao.trim()) return;

    setAddingObservacao(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      if (!token) {
        throw new Error('Não autenticado');
      }

      const response = await fetch('/api/atendimentos-observacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          atendimento_id: parseInt(id),
          observacao: novaObservacao.trim(),
          usuario_email: currentUserEmail,
          usuario_nome: currentUserName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao adicionar observação');
      }

      // Recarregar observações
      await fetchObservacoes();
      setNovaObservacao('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingObservacao(false);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Fortaleza'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluido':
        return {
          color: 'from-emerald-500 to-green-500',
          icon: <FiCheckCircle className="w-5 h-5" />,
          label: 'Concluído'
        };
      case 'em_andamento':
        return {
          color: 'from-amber-500 to-orange-500',
          icon: <FiClock className="w-5 h-5" />,
          label: 'Em andamento'
        };
      case 'correcao':
        return {
          color: 'from-rose-500 to-red-500',
          icon: <FiAlertCircle className="w-5 h-5" />,
          label: 'Correção'
        };
      case 'cancelado':
        return {
          color: 'from-slate-500 to-gray-600',
          icon: <FiXCircle className="w-5 h-5" />,
          label: 'Cancelado'
        };
      case 'bloqueado':
        return {
          color: 'from-slate-500 to-gray-600',
          icon: <FiLock className="w-5 h-5" />,
          label: 'Bloqueado'
        };
      case 'entregue':
        return {
          color: 'from-blue-500 to-indigo-500',
          icon: <FiCheckCircle className="w-5 h-5" />,
          label: 'Entregue'
        };
      default:
        return {
          color: 'from-slate-500 to-gray-600',
          icon: <FiSlash className="w-5 h-5" />,
          label: status
        };
    }
  };

  if (loading) return <Loading />;
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-red-200 max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiAlertCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Erro</h2>
        <p className="text-center text-slate-600">{error}</p>
      </div>
    </div>
  );
  if (!atendimento) return <div>Atendimento não encontrado</div>;

  const statusConfig = getStatusConfig(atendimento.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-xl p-8 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <FiFileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">Detalhes do Atendimento</h1>
                    <p className="text-white/80 text-sm">Protocolo: {atendimento.protocolo}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl border-2 border-white/30 transition-all duration-300 font-bold shadow-lg hover:shadow-xl"
                  >
                    <FiEdit className="w-5 h-5" />
                    Editar
                  </button>
                ) : (
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl border-2 border-white/30 transition-all duration-300 font-bold"
                  >
                    <FiX className="w-5 h-5" />
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl border-2 border-white/30 transition-all duration-300 font-bold"
                >
                  <FiArrowLeft className="w-5 h-5" />
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status e Atendente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <div className={`w-10 h-10 bg-gradient-to-br ${statusConfig.color} rounded-xl flex items-center justify-center text-white`}>
                {statusConfig.icon}
              </div>
              Status do Atendimento
            </h3>
            {isEditing ? (
              <select
                value={editedAtendimento.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold"
              >
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="correcao">Correção</option>
                <option value="cancelado">Cancelado</option>
                <option value="bloqueado">Bloqueado</option>
                <option value="entregue">Entregue</option>
              </select>
            ) : (
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${statusConfig.color} text-white rounded-xl font-bold shadow-md`}>
                {statusConfig.icon}
                {statusConfig.label}
              </div>
            )}
          </div>

          {atendimento.atendente_nome && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white">
                  <FiUser className="w-5 h-5" />
                </div>
                Atendente Responsável
              </h3>
              <p className="text-2xl font-bold text-slate-800">{atendimento.atendente_nome}</p>
            </div>
          )}
        </div>

        {/* Informações Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Informações Pessoais */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <FiUser className="w-5 h-5 text-white" />
              </div>
              Informações Pessoais
            </h2>
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiUser className="w-4 h-4" />
                  Nome Completo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedAtendimento.nome || ''}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 font-semibold ${
                      validationErrors.nome ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">{atendimento.nome}</p>
                )}
                {validationErrors.nome && <p className="text-red-500 text-sm mt-1 font-medium">{validationErrors.nome}</p>}
              </div>

              {/* CPF */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiCreditCard className="w-4 h-4" />
                  CPF
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedAtendimento.cpf || ''}
                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 font-semibold ${
                      validationErrors.cpf ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">{atendimento.cpf}</p>
                )}
                {validationErrors.cpf && <p className="text-red-500 text-sm mt-1 font-medium">{validationErrors.cpf}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiMail className="w-4 h-4" />
                  E-mail
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedAtendimento.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 font-semibold ${
                      validationErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl break-all">{atendimento.email}</p>
                )}
                {validationErrors.email && <p className="text-red-500 text-sm mt-1 font-medium">{validationErrors.email}</p>}
              </div>

              {/* Solicitante */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiUser className="w-4 h-4" />
                  Solicitante
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedAtendimento.solicitante || ''}
                    onChange={(e) => handleInputChange('solicitante', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">{atendimento.solicitante}</p>
                )}
              </div>
            </div>
          </div>

          {/* Informações do Atendimento */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <FiCalendar className="w-5 h-5 text-white" />
              </div>
              Informações do Atendimento
            </h2>
            <div className="space-y-4">
              {/* Data */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiCalendar className="w-4 h-4" />
                  Data
                </label>
                <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">
                  {formatDate(atendimento.dia_atual)}
                </p>
              </div>

              {/* Horário */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  Horário
                </label>
                <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">
                  {formatTime(atendimento.horario)}
                </p>
              </div>

              {/* Protocolo */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Protocolo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedAtendimento.protocolo || ''}
                    onChange={(e) => handleInputChange('protocolo', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">{atendimento.protocolo}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Histórico de Observações */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <FiMessageSquare className="w-5 h-5 text-white" />
            </div>
            Histórico de Observações
          </h2>

          {/* Timeline de Observações */}
          {historicoObservacoes.length > 0 ? (
            <div className="space-y-4 mb-6">
              {historicoObservacoes.map((obs) => (
                <div key={obs.id} className="relative pl-8 pb-4 border-l-2 border-slate-200 last:border-0">
                  <div className="absolute -left-2 top-0 w-4 h-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full border-2 border-white"></div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white">
                          <FiUser className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-800">{obs.usuario_nome || 'Usuário'}</span>
                      </div>
                      <span className="text-sm text-slate-500 font-medium">{formatDateTime(obs.created_at)}</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{obs.observacao}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl mb-6">
              <FiMessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma observação registrada ainda</p>
            </div>
          )}

          {/* Adicionar Nova Observação */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FiPlus className="w-4 h-4" />
              Adicionar Nova Observação
            </label>
            <textarea
              value={novaObservacao}
              onChange={(e) => setNovaObservacao(e.target.value)}
              placeholder="Digite sua observação aqui..."
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none font-medium"
              rows={4}
            />
            <button
              onClick={handleAddObservacao}
              disabled={!novaObservacao.trim() || addingObservacao}
              className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {addingObservacao ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adicionando...
                </>
              ) : (
                <>
                  <FiPlus className="w-5 h-5" />
                  Adicionar Observação
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <FiTrash2 className="w-5 h-5" />
            Excluir Atendimento
          </button>

          {isEditing && (
            <button
              onClick={handleSave}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <FiSave className="w-5 h-5" />
              Salvar Alterações
            </button>
          )}
        </div>

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiAlertCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-center text-slate-800 mb-4">Confirmar Exclusão</h3>
              <p className="text-slate-600 text-center mb-8 leading-relaxed">
                Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita e todos os dados serão perdidos permanentemente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
