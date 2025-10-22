'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  FiX,
  FiUser,
  FiMail,
  FiCalendar,
  FiClock,
  FiFileText,
  FiSave,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiLock,
  FiMessageSquare,
  FiPlus,
  FiCreditCard,
} from 'react-icons/fi';

interface ObservacaoHistorico {
  texto: string;
  data: string;
  usuario: string;
  usuario_id?: string;
}

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
  atendente_nome?: string;
}

interface EditAtendimentoModalProps {
  show: boolean;
  onClose: () => void;
  atendimento: Atendimento;
  editingAtendimento: Partial<Atendimento>;
  onInputChange: (field: keyof Atendimento, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  validationErrors: Record<string, string>;
}

export default function EditAtendimentoModal({
  show,
  onClose,
  atendimento,
  editingAtendimento,
  onInputChange,
  onSave,
  onCancel,
  saving,
  validationErrors
}: EditAtendimentoModalProps) {
  const { user } = useAuth();
  const [historicoObservacoes, setHistoricoObservacoes] = useState<ObservacaoHistorico[]>([]);
  const [novaObservacao, setNovaObservacao] = useState('');
  const [addingObservacao, setAddingObservacao] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>('');

  useEffect(() => {
    if (show && user) {
      fetchCurrentUserName();
      parseObservacoes();
    }
  }, [show, atendimento, user]);

  const fetchCurrentUserName = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('auth_id', user.id)
        .single();

      if (!error && data) {
        setCurrentUserName(data.name);
      }
    } catch (err) {
      console.error('Erro ao buscar nome do usuário:', err);
    }
  };

  const parseObservacoes = () => {
    if (!atendimento.observacoes) {
      setHistoricoObservacoes([]);
      return;
    }

    try {
      const parsed = JSON.parse(atendimento.observacoes);
      if (Array.isArray(parsed)) {
        setHistoricoObservacoes(parsed);
      } else {
        setHistoricoObservacoes([{
          texto: atendimento.observacoes,
          data: new Date().toISOString(),
          usuario: atendimento.atendente_nome || 'Sistema'
        }]);
      }
    } catch {
      if (atendimento.observacoes.trim()) {
        setHistoricoObservacoes([{
          texto: atendimento.observacoes,
          data: new Date().toISOString(),
          usuario: atendimento.atendente_nome || 'Sistema'
        }]);
      }
    }
  };

  const handleAddObservacao = async () => {
    if (!novaObservacao.trim()) return;

    setAddingObservacao(true);
    try {
      const novaEntrada: ObservacaoHistorico = {
        texto: novaObservacao,
        data: new Date().toISOString(),
        usuario: currentUserName || 'Usuário',
        usuario_id: user?.id
      };

      const novoHistorico = [...historicoObservacoes, novaEntrada];

      const { error } = await supabase
        .from('atendimentos')
        .update({ observacoes: JSON.stringify(novoHistorico) })
        .eq('id', atendimento.id);

      if (error) throw error;

      setHistoricoObservacoes(novoHistorico);
      setNovaObservacao('');
    } catch (err: any) {
      console.error('Erro ao adicionar observação:', err);
      alert('Erro ao adicionar observação. Tente novamente.');
    } finally {
      setAddingObservacao(false);
    }
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluido':
        return { color: 'from-emerald-500 to-green-500', icon: <FiCheckCircle className="w-4 h-4" />, label: 'Concluído' };
      case 'em_andamento':
        return { color: 'from-amber-500 to-orange-500', icon: <FiClock className="w-4 h-4" />, label: 'Em andamento' };
      case 'correcao':
        return { color: 'from-rose-500 to-red-500', icon: <FiAlertCircle className="w-4 h-4" />, label: 'Correção' };
      case 'cancelado':
        return { color: 'from-slate-500 to-gray-600', icon: <FiXCircle className="w-4 h-4" />, label: 'Cancelado' };
      case 'bloqueado':
        return { color: 'from-slate-500 to-gray-600', icon: <FiLock className="w-4 h-4" />, label: 'Bloqueado' };
      case 'entregue':
        return { color: 'from-blue-500 to-indigo-500', icon: <FiCheckCircle className="w-4 h-4" />, label: 'Entregue' };
      default:
        return { color: 'from-slate-500 to-gray-600', icon: <FiClock className="w-4 h-4" />, label: status };
    }
  };

  if (!show) return null;

  const statusConfig = getStatusConfig(editingAtendimento.status || atendimento.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">Editar Atendimento</h2>
                <p className="text-white/80 text-sm">Protocolo: {atendimento.protocolo}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center text-white transition-all duration-200"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal - Formulário */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status e Atendente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status */}
                <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-4">
                  <label className="block text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                    <div className={`w-8 h-8 bg-gradient-to-br ${statusConfig.color} rounded-lg flex items-center justify-center text-white`}>
                      {statusConfig.icon}
                    </div>
                    Status
                  </label>
                  <select
                    value={editingAtendimento.status || ''}
                    onChange={(e) => onInputChange('status', e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold text-sm"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="concluido">Concluído</option>
                    <option value="correcao">Correção</option>
                    <option value="bloqueado">Bloqueado</option>
                    <option value="entregue">Entregue</option>
                  </select>
                </div>

                {/* Atendente */}
                {atendimento.atendente_nome && (
                  <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-4">
                    <label className="block text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white">
                        <FiUser className="w-4 h-4" />
                      </div>
                      Atendente
                    </label>
                    <p className="text-lg font-bold text-slate-800">{atendimento.atendente_nome}</p>
                  </div>
                )}
              </div>

              {/* Dados Pessoais */}
              <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white">
                    <FiUser className="w-4 h-4" />
                  </div>
                  Informações Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                      <FiUser className="w-4 h-4" />
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={editingAtendimento.nome || ''}
                      onChange={(e) => onInputChange('nome', e.target.value)}
                      className={`w-full px-4 py-2.5 border-2 rounded-xl transition-all duration-200 font-semibold text-sm ${
                        validationErrors.nome ? 'border-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                      placeholder="Nome completo"
                    />
                    {validationErrors.nome && <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.nome}</p>}
                  </div>

                  {/* CPF */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                      <FiCreditCard className="w-4 h-4" />
                      CPF *
                    </label>
                    <input
                      type="text"
                      value={editingAtendimento.cpf || ''}
                      onChange={(e) => onInputChange('cpf', e.target.value)}
                      className={`w-full px-4 py-2.5 border-2 rounded-xl transition-all duration-200 font-semibold text-sm ${
                        validationErrors.cpf ? 'border-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                      placeholder="000.000.000-00"
                    />
                    {validationErrors.cpf && <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.cpf}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                      <FiMail className="w-4 h-4" />
                      E-mail *
                    </label>
                    <input
                      type="email"
                      value={editingAtendimento.email || ''}
                      onChange={(e) => onInputChange('email', e.target.value)}
                      className={`w-full px-4 py-2.5 border-2 rounded-xl transition-all duration-200 font-semibold text-sm ${
                        validationErrors.email ? 'border-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                      placeholder="email@exemplo.com"
                    />
                    {validationErrors.email && <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.email}</p>}
                  </div>

                  {/* Solicitante */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                      <FiUser className="w-4 h-4" />
                      Solicitante *
                    </label>
                    <input
                      type="text"
                      value={editingAtendimento.solicitante || ''}
                      onChange={(e) => onInputChange('solicitante', e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold text-sm"
                      placeholder="Nome do solicitante"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Atendimento */}
              <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white">
                    <FiCalendar className="w-4 h-4" />
                  </div>
                  Dados do Atendimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Data */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                      <FiCalendar className="w-4 h-4" />
                      Data *
                    </label>
                    <input
                      type="date"
                      value={editingAtendimento.dia_atual || ''}
                      onChange={(e) => onInputChange('dia_atual', e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold text-sm"
                    />
                  </div>

                  {/* Horário */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                      <FiClock className="w-4 h-4" />
                      Horário *
                    </label>
                    <input
                      type="time"
                      value={editingAtendimento.horario || ''}
                      onChange={(e) => onInputChange('horario', e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold text-sm"
                    />
                  </div>

                  {/* Protocolo */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                      <FiFileText className="w-4 h-4" />
                      Protocolo *
                    </label>
                    <input
                      type="text"
                      value={editingAtendimento.protocolo || ''}
                      onChange={(e) => onInputChange('protocolo', e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold text-sm"
                      placeholder="Número do protocolo"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Lateral - Histórico de Observações */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-4 sticky top-0">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white">
                    <FiMessageSquare className="w-4 h-4" />
                  </div>
                  Histórico
                </h3>

                {/* Timeline de Observações */}
                {historicoObservacoes.length > 0 ? (
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
                    {historicoObservacoes.map((obs, index) => (
                      <div key={index} className="relative pl-6 pb-3 border-l-2 border-slate-200 last:border-0">
                        <div className="absolute -left-1.5 top-0 w-3 h-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full border-2 border-white"></div>
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-md flex items-center justify-center text-white">
                              <FiUser className="w-3 h-3" />
                            </div>
                            <span className="font-bold text-slate-800 text-xs">{obs.usuario}</span>
                          </div>
                          <p className="text-slate-700 text-xs mb-1 leading-relaxed">{obs.texto}</p>
                          <span className="text-xs text-slate-500 font-medium">{formatDateTime(obs.data)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-lg mb-4">
                    <FiMessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs font-medium">Nenhuma observação</p>
                  </div>
                )}

                {/* Adicionar Nova Observação */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border-2 border-blue-200">
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <FiPlus className="w-3 h-3" />
                    Nova Observação
                  </label>
                  <textarea
                    value={novaObservacao}
                    onChange={(e) => setNovaObservacao(e.target.value)}
                    placeholder="Digite aqui..."
                    className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none text-xs font-medium"
                    rows={3}
                  />
                  <button
                    onClick={handleAddObservacao}
                    disabled={!novaObservacao.trim() || addingObservacao}
                    className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold text-xs shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {addingObservacao ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Adicionando...
                      </>
                    ) : (
                      <>
                        <FiPlus className="w-4 h-4" />
                        Adicionar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all duration-200 text-sm flex items-center gap-2"
          >
            <FiX className="w-4 h-4" />
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
