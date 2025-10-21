'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { usePermissions } from '@/hooks/usePermissions';
import { FiX, FiUser, FiMail, FiCalendar, FiClock, FiFileText, FiAlertCircle, FiSave, FiTrash2 } from 'react-icons/fi';

export interface Atendimento {
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
  fotos_coletadas?: boolean;
}

interface AtendimentoModalProps {
  atendimento: Atendimento;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Atendimento) => void;
  onDelete?: (id: number) => void;
}

export default function AtendimentoModal({
  atendimento,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}: AtendimentoModalProps) {
  const [formData, setFormData] = useState<Partial<Atendimento>>(atendimento);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { isAdmin, isSuperAdmin, role } = usePermissions();

  // Permissão para excluir: apenas admin e superadmin
  const canDelete = isAdmin || isSuperAdmin;

  useEffect(() => {
    if (isOpen) {
      setFormData(atendimento);
      setValidationErrors({});
    }
  }, [isOpen, atendimento]);

  if (!isOpen) return null;

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

  const handleChange = (field: keyof Atendimento, value: string) => {
    setValidationErrors(prev => ({ ...prev, [field]: '' }));

    if (field === 'cpf') {
      const error = validateCPF(value);
      if (error) setValidationErrors(prev => ({ ...prev, [field]: error }));
    }

    if (field === 'email') {
      const error = validateEmail(value);
      if (error) setValidationErrors(prev => ({ ...prev, [field]: error }));
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validar campos obrigatórios
    const requiredFields: (keyof Atendimento)[] = [
      'nome', 'cpf', 'email', 'solicitante', 'protocolo', 'dia_atual', 'horario', 'status'
    ];

    const errors: Record<string, string> = {};
    requiredFields.forEach(field => {
      if (!formData[field]) {
        errors[field] = 'Campo obrigatório';
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('atendimentos')
        .update(formData)
        .eq('id', atendimento.id);

      if (error) throw error;

      onUpdate({ ...atendimento, ...formData } as Atendimento);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar atendimento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      alert('Você não tem permissão para excluir atendimentos.');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o atendimento de ${atendimento.nome}?`)) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('atendimentos')
        .delete()
        .eq('id', atendimento.id);

      if (error) throw error;

      if (onDelete) {
        onDelete(atendimento.id);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir atendimento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FiFileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Editar Atendimento</h2>
                <p className="text-emerald-100 text-sm mt-0.5">Protocolo: {atendimento.protocolo}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-200"
              disabled={saving}
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-3">
                <FiUser className="h-4 w-4 text-emerald-600" />
              </div>
              Dados Pessoais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.nome || ''}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                    validationErrors.nome
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                  }`}
                  placeholder="Nome completo do cliente"
                />
                {validationErrors.nome && (
                  <p className="text-red-600 text-xs mt-1 flex items-center">
                    <FiAlertCircle className="mr-1" />
                    {validationErrors.nome}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  value={formData.cpf || ''}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                    validationErrors.cpf
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                  }`}
                  placeholder="000.000.000-00"
                />
                {validationErrors.cpf && (
                  <p className="text-red-600 text-xs mt-1 flex items-center">
                    <FiAlertCircle className="mr-1" />
                    {validationErrors.cpf}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                    validationErrors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                  }`}
                  placeholder="email@exemplo.com"
                />
                {validationErrors.email && (
                  <p className="text-red-600 text-xs mt-1 flex items-center">
                    <FiAlertCircle className="mr-1" />
                    {validationErrors.email}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Solicitante *
                </label>
                <input
                  type="text"
                  value={formData.solicitante || ''}
                  onChange={(e) => handleChange('solicitante', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                    validationErrors.solicitante
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                  }`}
                  placeholder="Nome do solicitante"
                />
                {validationErrors.solicitante && (
                  <p className="text-red-600 text-xs mt-1 flex items-center">
                    <FiAlertCircle className="mr-1" />
                    {validationErrors.solicitante}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Agendamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                <FiCalendar className="h-4 w-4 text-blue-600" />
              </div>
              Agendamento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.dia_atual || ''}
                  onChange={(e) => handleChange('dia_atual', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                    validationErrors.dia_atual
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                  }`}
                />
                {validationErrors.dia_atual && (
                  <p className="text-red-600 text-xs mt-1 flex items-center">
                    <FiAlertCircle className="mr-1" />
                    {validationErrors.dia_atual}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Horário *
                </label>
                <input
                  type="time"
                  value={formData.horario || ''}
                  onChange={(e) => handleChange('horario', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                    validationErrors.horario
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                  }`}
                />
                {validationErrors.horario && (
                  <p className="text-red-600 text-xs mt-1 flex items-center">
                    <FiAlertCircle className="mr-1" />
                    {validationErrors.horario}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  value={formData.status || ''}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                    validationErrors.status
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                  }`}
                >
                  <option value="">Selecione</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="correcao">Correção</option>
                  <option value="bloqueado">Bloqueado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="entregue">Entregue</option>
                </select>
                {validationErrors.status && (
                  <p className="text-red-600 text-xs mt-1 flex items-center">
                    <FiAlertCircle className="mr-1" />
                    {validationErrors.status}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Protocolo *
              </label>
              <input
                type="text"
                value={formData.protocolo || ''}
                onChange={(e) => handleChange('protocolo', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                  validationErrors.protocolo
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                    : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                }`}
                placeholder="Número do protocolo"
              />
              {validationErrors.protocolo && (
                <p className="text-red-600 text-xs mt-1 flex items-center">
                  <FiAlertCircle className="mr-1" />
                  {validationErrors.protocolo}
                </p>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                <FiFileText className="h-4 w-4 text-purple-600" />
              </div>
              Observações
            </h3>

            <textarea
              value={formData.observacoes || ''}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all resize-none"
              placeholder="Adicione observações sobre o atendimento..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-8 py-6 rounded-b-3xl border-t-2 border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              {canDelete ? (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center px-5 py-3 border-2 border-red-200 text-sm font-bold rounded-xl text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiTrash2 className="mr-2 h-4 w-4" />
                  Excluir
                </button>
              ) : (
                <p className="text-xs text-gray-500">
                  Apenas administradores podem excluir atendimentos
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-6 py-3 border-2 border-gray-300 text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-300 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-6 py-3 border-2 border-transparent text-sm font-bold rounded-xl shadow-lg text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
