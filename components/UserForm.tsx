'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/lib/models/User';
import { supabase } from '@/lib/supabase-client';
import { FiUser, FiMail, FiShield, FiToggleRight, FiAlertCircle, FiRefreshCw, FiLink, FiPhone, FiLock, FiCheck, FiSave, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

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
  syncWithAuth?: boolean;
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
  const [showAuthUsers, setShowAuthUsers] = useState(!user);

  const fetchAuthUsers = async () => {
    try {
      setLoadingAuthUsers(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Você precisa estar logado para gerenciar usuários.');
        return;
      }

      const response = await fetch('/api/auth/list-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao buscar usuários do Auth:', errorData);
        setError('Erro ao carregar usuários do Supabase Auth.');
        return;
      }

      const data = await response.json();
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

  const handleAuthUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const authUserId = e.target.value;
    setSelectedAuthUser(authUserId);

    if (authUserId) {
      const authUser = authUsers.find(u => u.id === authUserId);
      if (authUser) {
        setFormData(prev => ({
          ...prev,
          email: authUser.email || prev.email,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || prev.name,
          auth_id: authUser.id,
          phone: authUser.phone || authUser.user_metadata?.phone || prev.phone
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        auth_id: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name?.trim()) throw new Error('O nome é obrigatório');
      if (!formData.email?.trim()) throw new Error('O email é obrigatório');

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) throw new Error('Formato de email inválido');

      if (!user && !selectedAuthUser && (!formData.password || formData.password.length < 6)) {
        throw new Error('Senha obrigatória (mínimo 6 caracteres) ou selecione um usuário existente');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      if (user?.id) {
        // Update existing user logic
        if (formData.syncWithAuth && user.auth_id) {
          const updateAuthData: any = { userId: user.auth_id };
          if (formData.email !== user.email) updateAuthData.email = formData.email;
          if (formData.phone) updateAuthData.phone = formData.phone;
          if (formData.password) updateAuthData.password = formData.password;

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
            throw new Error(errorData.error || 'Erro ao atualizar Auth');
          }
        }

        const updateData = {
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

        if (!response.ok) throw new Error('Erro ao atualizar usuário');

      } else {
        // Create new user logic
        let authId = formData.auth_id || selectedAuthUser;

        if (!authId && formData.email && formData.password) {
          const createAuthData = {
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            user_metadata: { full_name: formData.name, name: formData.name }
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
            throw new Error(errorData.error || 'Erro ao criar usuário no Auth');
          }

          const authData = await authResponse.json();
          authId = authData.user.id;
        }

        const createData: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status
        };

        if (authId) createData.auth_id = authId;

        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createData)
        });

        if (!response.ok) throw new Error('Erro ao criar usuário');
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setError(error.message || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto shadow-2xl border-0 bg-white/90 backdrop-blur-sm animate-in slide-in-from-bottom-5 duration-500 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

      <CardHeader className="pb-8 pt-8 px-8 bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              {user ? <FiUser className="text-blue-600" /> : <FiUserPlus className="text-blue-600" />}
              {user ? 'Editar Usuário' : 'Novo Usuário'}
            </CardTitle>
            <CardDescription className="text-slate-500 mt-2 text-base">
              {user ? 'Atualize as informações e permissões do usuário' : 'Preencha os dados para adicionar um novo membro'}
            </CardDescription>
          </div>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600">
              <FiX className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-3 animate-shake">
              <FiAlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-red-800">Erro ao salvar</h4>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Auth Link Section (Only for new users) */}
          {!user && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 transition-all hover:border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <FiLink className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Vincular Conta Existente</h3>
                    <p className="text-xs text-slate-500">Opcional: Selecione um usuário do Supabase Auth</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchAuthUsers}
                  disabled={loadingAuthUsers}
                  className="text-blue-600 hover:bg-blue-100"
                >
                  <FiRefreshCw className={`h-4 w-4 mr-2 ${loadingAuthUsers ? 'animate-spin' : ''}`} />
                  Atualizar Lista
                </Button>
              </div>

              <select
                value={selectedAuthUser}
                onChange={handleAuthUserSelect}
                className="w-full h-11 rounded-lg border-slate-200 bg-white text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Criar novo login manualmente</option>
                {authUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.email} {u.user_metadata?.full_name ? `(${u.user_metadata.full_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-6">
            {/* Personal Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FiUser className="text-slate-400" /> Nome Completo <span className="text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: João Silva"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FiMail className="text-slate-400" /> Email <span className="text-red-500">*</span>
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="joao@exemplo.com"
                  className="h-11"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FiPhone className="text-slate-400" /> Telefone
                </label>
                <Input
                  name="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="h-11"
                />
              </div>

              {/* Password Field */}
              {(!user || formData.syncWithAuth) && !selectedAuthUser && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FiLock className="text-slate-400" /> Senha {!user && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password || ''}
                    onChange={handleChange}
                    placeholder={user ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                    className="h-11"
                    required={!user}
                    minLength={6}
                  />
                </div>
              )}
            </div>

            <div className="h-px bg-slate-100 my-2"></div>

            {/* Permissions */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FiShield className="text-slate-400" /> Função
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full h-11 rounded-lg border-slate-200 bg-white text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="user">Usuário (Padrão)</option>
                  <option value="atendente">Atendente</option>
                  <option value="admin">Administrador</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                <p className="text-xs text-slate-500">
                  {formData.role === 'superadmin' && 'Acesso total ao sistema.'}
                  {formData.role === 'admin' && 'Gerencia usuários e atendimentos.'}
                  {formData.role === 'atendente' && 'Gerencia apenas atendimentos.'}
                  {formData.role === 'user' && 'Apenas agendamento.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FiToggleRight className="text-slate-400" /> Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full h-11 rounded-lg border-slate-200 bg-white text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>

            {/* Sync Checkbox */}
            {user && user.auth_id && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <input
                  type="checkbox"
                  id="syncWithAuth"
                  checked={formData.syncWithAuth}
                  onChange={(e) => setFormData(prev => ({ ...prev, syncWithAuth: e.target.checked }))}
                  className="mt-1 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <label htmlFor="syncWithAuth" className="text-sm font-bold text-slate-800 block">
                    Sincronizar com Login
                  </label>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Atualizar também o email e senha de acesso do usuário.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="h-11 px-6">
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all"
            >
              {loading ? (
                <FiRefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <FiSave className="mr-2 h-5 w-5" />
                  {user ? 'Salvar Alterações' : 'Criar Usuário'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 
