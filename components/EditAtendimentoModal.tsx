'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { formatCpf } from '@/lib/utils';
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
  FiSend,
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
  coletor_nome?: string;
  coletor_id?: string;
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

  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza'
    }).replace(',', ' as');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluido':
        return { color: 'bg-emerald-500', icon: <FiCheckCircle className="w-4 h-4" />, label: 'Concluído' };
      case 'em_andamento':
        return { color: 'bg-amber-500', icon: <FiClock className="w-4 h-4" />, label: 'Em andamento' };
      case 'correcao':
        return { color: 'bg-rose-500', icon: <FiAlertCircle className="w-4 h-4" />, label: 'Correção' };
      case 'cancelado':
        return { color: 'bg-slate-500', icon: <FiXCircle className="w-4 h-4" />, label: 'Cancelado' };
      case 'bloqueado':
        return { color: 'bg-slate-600', icon: <FiLock className="w-4 h-4" />, label: 'Bloqueado' };
      case 'entregue':
        return { color: 'bg-blue-500', icon: <FiCheckCircle className="w-4 h-4" />, label: 'Entregue' };
      default:
        return { color: 'bg-slate-500', icon: <FiClock className="w-4 h-4" />, label: status };
    }
  };

  if (!show) return null;

  const statusConfig = getStatusConfig(editingAtendimento.status || atendimento.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header Moderno */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Editar Atendimento</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-white/90 text-sm">Protocolo: <span className="font-bold">{atendimento.protocolo}</span></span>
                {atendimento.atendente_nome && (
                  <>
                    <span className="text-white/50">•</span>
                    <span className="text-white/90 text-sm">Atendente: <span className="font-bold">{atendimento.atendente_nome}</span></span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Formulário */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Status */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-3">Status do Atendimento</label>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${statusConfig.color} rounded-xl flex items-center justify-center text-white`}>
                    {statusConfig.icon}
                  </div>
                  <select
                    value={editingAtendimento.status || ''}
                    onChange={(e) => onInputChange('status', e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold bg-white"
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
              </div>

              {/* Informações Pessoais */}
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FiUser className="w-5 h-5 text-blue-600" />
                  Informações Pessoais
                </h3>
                <div className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo *</label>
                    <input
                      type="text"
                      value={editingAtendimento.nome || ''}
                      onChange={(e) => onInputChange('nome', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl transition-all font-medium ${
                        validationErrors.nome ? 'border-red-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="Nome completo"
                    />
                    {validationErrors.nome && <p className="text-red-500 text-sm mt-1">{validationErrors.nome}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* CPF */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">CPF *</label>
                      <input
                        type="text"
                        value={formatCpf(editingAtendimento.cpf || '')}
                        onChange={(e) => onInputChange('cpf', e.target.value.replace(/\D/g, '').slice(0, 11))}
                        className={`w-full px-4 py-3 border-2 rounded-xl transition-all font-medium font-mono ${
                          validationErrors.cpf ? 'border-red-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                      {validationErrors.cpf && <p className="text-red-500 text-sm mt-1">{validationErrors.cpf}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail *</label>
                      <input
                        type="email"
                        value={editingAtendimento.email || ''}
                        onChange={(e) => onInputChange('email', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl transition-all font-medium ${
                          validationErrors.email ? 'border-red-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="email@exemplo.com"
                      />
                      {validationErrors.email && <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>}
                    </div>
                  </div>

                  {/* Solicitante */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Solicitante *</label>
                    <input
                      type="text"
                      value={editingAtendimento.solicitante || ''}
                      onChange={(e) => onInputChange('solicitante', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                      placeholder="Nome do solicitante"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Atendimento */}
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-purple-600" />
                  Dados do Atendimento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Data */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Data *</label>
                    <input
                      type="date"
                      value={editingAtendimento.dia_atual || ''}
                      onChange={(e) => onInputChange('dia_atual', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  {/* Horário */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Horário *</label>
                    <input
                      type="time"
                      value={editingAtendimento.horario || ''}
                      onChange={(e) => onInputChange('horario', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  {/* Protocolo */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Protocolo *</label>
                    <input
                      type="text"
                      value={editingAtendimento.protocolo || ''}
                      onChange={(e) => onInputChange('protocolo', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                      placeholder="Número do protocolo"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Histórico de Observações estilo Chat */}
          <div className="w-96 bg-gradient-to-b from-slate-50 to-slate-100 border-l-2 border-slate-200 flex flex-col">
            {/* Header do Chat */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiMessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Observações</h3>
                <p className="text-white/80 text-xs">{historicoObservacoes.length} mensagem{historicoObservacoes.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historicoObservacoes.length > 0 ? (
                historicoObservacoes.map((obs, index) => (
                  <div key={index} className="flex flex-col">
                    <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-slate-200">
                      <p className="text-slate-800 text-sm leading-relaxed mb-2">{obs.texto}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {obs.usuario} - {formatChatDate(obs.data)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FiMessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Nenhuma observação ainda</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input de Nova Mensagem */}
            <div className="p-4 bg-white border-t-2 border-slate-200">
              <div className="mb-3">
                <textarea
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Digite uma observação..."
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none text-sm"
                  rows={3}
                />
              </div>
              <button
                onClick={handleAddObservacao}
                disabled={!novaObservacao.trim() || addingObservacao}
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingObservacao ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <FiSend className="w-5 h-5" />
                    Enviar Observação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-200 bg-white px-8 py-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all flex items-center gap-2"
          >
            <FiX className="w-5 h-5" />
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </>
            ) : (
              <>
                <FiSave className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
