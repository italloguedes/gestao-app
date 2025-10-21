'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/models/User';
import { supabase } from '@/lib/supabase-client';
import { FiUser, FiMail, FiShield, FiToggleRight, FiAlertCircle, FiRefreshCw, FiLink, FiPhone } from 'react-icons/fi';

interface UserFormProps {
  user?: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type UserFormData = {
  name: string;
  email: string;
  phone?: string;
  role: User['role'];
  status: User['status'];
  auth_id?: string;
  password?: string;
  syncWithAuth?: boolean; // Se deve atualizar dados no Auth também
};

type AuthUser = {
  id: string;
  email: string;
  phone?: string;
  created_at: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    phone?: string;
  };
};

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    role: user?.role || 'user',
    status: user?.status || 'active',
    auth_id: user?.auth_id || '',
    password: '',
    syncWithAuth: false
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [loadingAuthUsers, setLoadingAuthUsers] = useState(false);
  const [selectedAuthUser, setSelectedAuthUser] = useState<string>('');
  const [showAuthUsers, setShowAuthUsers] = useState(!user); // Mostra por padrão ao criar novo

  // Buscar usuários do Supabase Auth via API Route
  const fetchAuthUsers = async () => {
    try {
      setLoadingAuthUsers(true);

      // Pegar token de autenticação do usuário logado
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Você precisa estar logado para gerenciar usuários.');
        return;
      }

      // Chamar rota API com token de autenticação
      const response = await fetch('/api/auth/list-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao buscar usuários do Auth:', errorData);

        if (response.status === 401) {
          setError('Sessão expirada. Faça login novamente.');
        } else if (response.status === 403) {
          setError('Você não tem permissão para listar usuários. Apenas super administradores.');
        } else {
          setError('Erro ao carregar usuários do Supabase Auth.');
        }
        return;
      }

      const data = await response.json();

      // Filtrar apenas usuários disponíveis (não vinculados) ou o usuário atual se estiver editando
      const availableUsers = data.users.filter((authUser: any) =>
        !authUser.is_linked || authUser.id === user?.auth_id
      );

      setAuthUsers(availableUsers);
    } catch (err) {
      console.error('Erro ao buscar usuários do Auth:', err);
      setError('Erro de conexão ao buscar usuários.');
    } finally {
      setLoadingAuthUsers(false);
    }
  };

  // Carregar usuários do Auth ao montar o componente
  useEffect(() => {
    if (showAuthUsers) {
      fetchAuthUsers();
    }
  }, [showAuthUsers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Quando selecionar um usuário do Auth, preencher os campos
  const handleAuthUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const authUserId = e.target.value;
    setSelectedAuthUser(authUserId);

    if (authUserId) {
      const authUser = authUsers.find(u => u.id === authUserId);
      if (authUser) {
        setFormData(prev => ({
          ...prev,
          email: authUser.email || prev.email,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || prev.name,
          auth_id: authUser.id
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Você precisa estar logado para gerenciar usuários.');
        setLoading(false);
        return;
      }

      if (user?.id) {
        // === ATUALIZANDO USUÁRIO EXISTENTE ===

        // 1. Se deve sincronizar com Auth e tem auth_id
        if (formData.syncWithAuth && user.auth_id) {
          const updateAuthData: any = {
            auth_id: user.auth_id
          };

          if (formData.email !== user.email) {
            updateAuthData.email = formData.email;
          }

          if (formData.phone) {
            updateAuthData.phone = formData.phone;
          }

          if (formData.password) {
            updateAuthData.password = formData.password;
          }

          // Chamar API para atualizar no Auth
          const authResponse = await fetch('/api/auth/update-user', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateAuthData)
          });

          if (!authResponse.ok) {
            const errorData = await authResponse.json();
            throw new Error(errorData.error || 'Erro ao atualizar dados no Supabase Auth');
          }
        }

        // 2. Atualizar na tabela users
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          updated_at: new Date().toISOString()
        };

        const response = await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            throw new Error('Sessão expirada. Faça login novamente.');
          } else if (response.status === 403) {
            throw new Error('Você não tem permissão para atualizar usuários.');
          }
          throw new Error(errorData.error || 'Erro ao atualizar usuário');
        }

      } else {
        // === CRIANDO NOVO USUÁRIO ===

        let authId = formData.auth_id;

        // 1. Se deve criar no Auth (tem email e senha)
        if (!authId && formData.email && formData.password) {
          const createAuthData = {
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            user_metadata: {
              full_name: formData.name,
              name: formData.name
            }
          };

          const authResponse = await fetch('/api/auth/create-user', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(createAuthData)
          });

          if (!authResponse.ok) {
            const errorData = await authResponse.json();
            throw new Error(errorData.error || 'Erro ao criar usuário no Supabase Auth');
          }

          const authData = await authResponse.json();
          authId = authData.user.id;
        }

        // 2. Criar na tabela users
        const createData = {
          auth_id: authId || `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status
        };

        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            throw new Error('Sessão expirada. Faça login novamente.');
          } else if (response.status === 403) {
            throw new Error('Você não tem permissão para criar usuários.');
          }
          throw new Error(errorData.error || 'Erro ao criar usuário');
        }
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      setError(error.message || 'Erro ao salvar usuário. Por favor, tente novamente.');
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
          {user ? 'Editar Usuário' : 'Novo Usuário'}
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

        {/* Seletor de Usuários do Supabase Auth (apenas ao criar) */}
        {!user && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <FiLink className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Vincular Usuário do Supabase Auth</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Selecione um usuário autenticado para vincular (opcional)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchAuthUsers}
                disabled={loadingAuthUsers}
                className="inline-flex items-center px-3 py-2 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors"
              >
                <FiRefreshCw className={`h-4 w-4 mr-1 ${loadingAuthUsers ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {loadingAuthUsers ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                <p className="text-sm text-gray-600 mt-3">Carregando usuários do Supabase Auth...</p>
              </div>
            ) : (
              <>
                <select
                  value={selectedAuthUser}
                  onChange={handleAuthUserSelect}
                  className="w-full px-5 py-3.5 rounded-xl border-2 border-blue-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-white text-gray-900 font-medium"
                >
                  <option value="">Criar manualmente (sem vincular)</option>
                  {authUsers.length === 0 ? (
                    <option value="" disabled>Nenhum usuário disponível</option>
                  ) : (
                    authUsers.map(authUser => (
                      <option key={authUser.id} value={authUser.id}>
                        {authUser.email} {authUser.user_metadata?.full_name ? `- ${authUser.user_metadata.full_name}` : ''}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-gray-600 mt-3">
                  {authUsers.length === 0 ? (
                    'Todos os usuários do Supabase Auth já estão vinculados ou não há usuários cadastrados.'
                  ) : (
                    `${authUsers.length} usuário(s) disponível(is) para vincular. Ao selecionar, os campos abaixo serão preenchidos automaticamente.`
                  )}
                </p>
              </>
            )}
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

          {/* Phone Field */}
          <div className="group">
            <label htmlFor="phone" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center mr-2 group-hover:bg-teal-200 transition-colors">
                <FiPhone className="h-4 w-4 text-teal-600" />
              </div>
              Telefone
              <span className="ml-auto text-xs font-normal text-gray-400">(Opcional)</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all duration-300"
              placeholder="Ex: (85) 98765-4321"
            />
            <p className="mt-2 text-xs text-gray-500 ml-10">
              Telefone para contato (será sincronizado com Supabase Auth se ativado)
            </p>
          </div>

          {/* Password Field (apenas ao criar ou se quiser atualizar) */}
          {(!user || formData.syncWithAuth) && (
            <div className="group">
              <label htmlFor="password" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-2 group-hover:bg-indigo-200 transition-colors">
                  <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                Senha
                <span className="ml-auto text-xs font-normal text-gray-400">
                  {user ? '(Deixe em branco para manter a atual)' : '(Mínimo 6 caracteres)'}
                </span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password || ''}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all duration-300"
                placeholder={user ? "Deixe em branco para não alterar" : "Digite uma senha segura"}
                minLength={6}
              />
              <p className="mt-2 text-xs text-gray-500 ml-10">
                {user ? 'Preencha apenas se desejar alterar a senha no Supabase Auth' : 'Senha para login no sistema (mínimo 6 caracteres)'}
              </p>
            </div>
          )}

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
              <option value="user">Usuário - Acesso apenas ao agendamento</option>
              <option value="atendente">Atendente - Acesso ao dashboard</option>
              <option value="admin">Administrador - Acesso completo ao dashboard</option>
              <option value="superadmin">Super Administrador - Acesso total ao sistema</option>
            </select>
            <p className="mt-2 text-xs text-gray-500 ml-10">
              {formData.role === 'superadmin' && 'Acesso completo: gerenciar usuários, configurações e todos os recursos'}
              {formData.role === 'admin' && 'Acesso ao dashboard: visualizar e gerenciar atendimentos e relatórios'}
              {formData.role === 'atendente' && 'Acesso limitado: gerenciar apenas atendimentos'}
              {formData.role === 'user' && 'Acesso público: criar e acompanhar agendamentos'}
            </p>
          </div>

          {/* Sync with Auth Checkbox (apenas ao editar usuário com auth_id) */}
          {user && user.auth_id && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  id="syncWithAuth"
                  name="syncWithAuth"
                  checked={formData.syncWithAuth}
                  onChange={(e) => setFormData(prev => ({ ...prev, syncWithAuth: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-4 focus:ring-amber-100 transition-all cursor-pointer"
                />
                <div className="flex-1">
                  <label htmlFor="syncWithAuth" className="text-sm font-bold text-gray-900 cursor-pointer">
                    Sincronizar alterações com Supabase Auth
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Ao ativar, as alterações de email, telefone e senha também serão aplicadas no Supabase Auth (sistema de autenticação).
                    Isso mantém os dados sincronizados entre a tabela de usuários e o sistema de login.
                  </p>
                  {formData.syncWithAuth && (
                    <div className="mt-3 flex items-start space-x-2 text-xs text-amber-800 bg-amber-100 p-3 rounded-xl">
                      <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p>
                        <strong>Atenção:</strong> As alterações no email e senha afetarão o login deste usuário.
                        {formData.password && ' A nova senha será aplicada imediatamente.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              <option value="active">Ativo - Usuário pode acessar o sistema</option>
              <option value="inactive">Inativo - Acesso bloqueado</option>
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
                <span className="relative z-10">{user ? 'Atualizar Usuário' : 'Criar Usuário'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 
