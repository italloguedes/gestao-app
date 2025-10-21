'use client';

import { useState } from 'react';
import { User } from '@/lib/models/User';
import { supabase } from '@/lib/supabase-client';
import { FiUser, FiMail, FiShield, FiToggleRight, FiAlertCircle } from 'react-icons/fi';

interface UserFormProps {
  user?: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type UserFormData = {
  name: string;
  email: string;
  role: User['role'];
  status: User['status'];
};

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'user',
    status: user?.status || 'active'
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (user?.id) {
        // Atualizando usuário existente
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // Criando novo usuário
        const generatedAuthId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const { error: createError } = await supabase
          .from('users')
          .insert([{
            auth_id: generatedAuthId,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            status: formData.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (createError) throw createError;
      }

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setError('Erro ao salvar usuário. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderFieldError = (fieldName: string) => {
    if (!error) return null;

    return (
      <div className="mt-1 text-sm text-red-600 flex items-center">
        <FiAlertCircle className="mr-1" />
        {error}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto border-2 border-gray-100 animate-slide-up">
      {/* Modern Header with Gradient Bar */}
      <div className="mb-8">
        <div className="h-1.5 w-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mb-4"></div>
        <h2 className="text-3xl font-bold text-gray-900">
          {user ? '✏️ Editar Usuário' : '➕ Novo Usuário'}
        </h2>
        <p className="text-gray-600 mt-2">
          {user ? 'Atualize as informações do usuário abaixo' : 'Preencha os dados para criar um novo usuário no sistema'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 p-5 shadow-lg animate-shake">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-bold text-red-900">Erro ao salvar</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Name Field */}
          <div className="group">
            <label htmlFor="name" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-2 group-hover:bg-emerald-200 transition-colors">
                <FiUser className="h-4 w-4 text-emerald-600" />
              </div>
              Nome Completo
              <span className="ml-auto text-xs font-normal text-red-500">* Obrigatório</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={`w-full px-5 py-3.5 rounded-2xl border-2 shadow-sm focus:outline-none transition-all duration-300 ${
                error ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
              }`}
              placeholder="Ex: João da Silva"
            />
            {renderFieldError('name')}
          </div>

          {/* Email Field */}
          <div className="group">
            <label htmlFor="email" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-2 group-hover:bg-blue-200 transition-colors">
                <FiMail className="h-4 w-4 text-blue-600" />
              </div>
              Email
              <span className="ml-auto text-xs font-normal text-red-500">* Obrigatório</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={`w-full px-5 py-3.5 rounded-2xl border-2 shadow-sm focus:outline-none transition-all duration-300 ${
                error ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
              }`}
              placeholder="Ex: joao.silva@email.com"
            />
            {renderFieldError('email')}
          </div>

          {/* Role Field */}
          <div className="group">
            <label htmlFor="role" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mr-2 group-hover:bg-purple-200 transition-colors">
                <FiShield className="h-4 w-4 text-purple-600" />
              </div>
              Função / Permissão
              <span className="ml-auto text-xs font-normal text-gray-400">(Define o nível de acesso)</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all duration-300 bg-white text-gray-900 font-medium"
            >
              <option value="user">👤 Usuário - Acesso apenas ao agendamento</option>
              <option value="atendente">👨‍💼 Atendente - Acesso ao dashboard</option>
              <option value="admin">⚡ Administrador - Acesso completo ao dashboard</option>
              <option value="superadmin">👑 Super Administrador - Acesso total ao sistema</option>
            </select>
            <p className="mt-2 text-xs text-gray-500 ml-10">
              {formData.role === 'superadmin' && '🔐 Acesso completo: gerenciar usuários, configurações e todos os recursos'}
              {formData.role === 'admin' && '📊 Acesso ao dashboard: visualizar e gerenciar atendimentos e relatórios'}
              {formData.role === 'atendente' && '📋 Acesso limitado: gerenciar apenas atendimentos'}
              {formData.role === 'user' && '🎫 Acesso público: criar e acompanhar agendamentos'}
            </p>
          </div>

          {/* Status Field */}
          <div className="group">
            <label htmlFor="status" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mr-2 group-hover:bg-orange-200 transition-colors">
                <FiToggleRight className="h-4 w-4 text-orange-600" />
              </div>
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all duration-300 bg-white text-gray-900 font-medium"
            >
              <option value="active">✅ Ativo - Usuário pode acessar o sistema</option>
              <option value="inactive">❌ Inativo - Acesso bloqueado</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center space-x-4 pt-6 border-t-2 border-gray-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="group flex-1 inline-flex items-center justify-center px-6 py-3.5 border-2 border-gray-300 rounded-2xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-300 font-semibold"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="group flex-1 inline-flex items-center justify-center px-8 py-3.5 border-2 border-transparent rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 hover:from-emerald-700 hover:via-emerald-800 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100 relative overflow-hidden"
          >
            {!loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="relative z-10">Salvando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="relative z-10">{user ? '💾 Atualizar Usuário' : '✨ Criar Usuário'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 
