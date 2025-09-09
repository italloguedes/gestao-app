import React from 'react';

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
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative border border-emerald-100 max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center mb-6">
          <div className="bg-emerald-100 p-3 rounded-xl mr-4">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-700">Editar Atendimento</h2>
            <p className="text-sm text-gray-500">Protocolo: {atendimento.protocolo}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações do Atendimento */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="h-5 w-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Dados do Atendimento
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={editingAtendimento.nome || ''}
                  onChange={(e) => onInputChange('nome', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.nome ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Nome completo"
                />
                {validationErrors.nome && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.nome}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF *
                </label>
                <input
                  type="text"
                  value={editingAtendimento.cpf || ''}
                  onChange={(e) => onInputChange('cpf', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.cpf ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="000.000.000-00"
                />
                {validationErrors.cpf && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.cpf}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={editingAtendimento.email || ''}
                  onChange={(e) => onInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="email@exemplo.com"
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solicitante *
                </label>
                <input
                  type="text"
                  value={editingAtendimento.solicitante || ''}
                  onChange={(e) => onInputChange('solicitante', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.solicitante ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Nome do solicitante"
                />
                {validationErrors.solicitante && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.solicitante}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Atendimento *
                </label>
                <input
                  type="date"
                  value={editingAtendimento.dia_atual || ''}
                  onChange={(e) => onInputChange('dia_atual', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.dia_atual ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {validationErrors.dia_atual && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.dia_atual}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário *
                </label>
                <input
                  type="time"
                  value={editingAtendimento.horario || ''}
                  onChange={(e) => onInputChange('horario', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.horario ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {validationErrors.horario && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.horario}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  value={editingAtendimento.status || ''}
                  onChange={(e) => onInputChange('status', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.status ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione o status</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="concluido">Concluído</option>
                  <option value="correcao">Correção</option>
                  <option value="bloqueado">Bloqueado</option>
                  <option value="entregue">Entregue</option>
                </select>
                {validationErrors.status && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.status}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Protocolo *
                </label>
                <input
                  type="text"
                  value={editingAtendimento.protocolo || ''}
                  onChange={(e) => onInputChange('protocolo', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.protocolo ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Número do protocolo"
                />
                {validationErrors.protocolo && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.protocolo}</p>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="h-5 w-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Observações
            </h3>
            <textarea
              value={(editingAtendimento as any).observacoes || ''}
              onChange={(e) => onInputChange('observacoes' as keyof Atendimento, e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              placeholder="Observações sobre o atendimento..."
            />
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
            disabled={saving}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 