'use client';

import React, { useState } from 'react';
import { User } from '@/lib/models/User';
import { supabase } from '@/lib/supabase-client';
import { FiUser, FiMail, FiShield, FiToggleRight, FiAlertCircle, FiRefreshCw, FiPhone, FiLock, FiSave, FiX, FiUserPlus } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  password?: string;
};

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'user',
    status: user?.status || 'active',
    password: ''
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
      if (!formData.name?.trim()) throw new Error('O nome é obrigatório');
      if (!formData.email?.trim()) throw new Error('O email é obrigatório');

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) throw new Error('Formato de email inválido');

      // Para novo usuário, senha é obrigatória
      if (!user && (!formData.password || formData.password.length < 6)) {
        throw new Error('Senha obrigatória (mínimo 6 caracteres)');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      if (user?.id) {
        // Atualizar usuário existente via /api/users/[id]
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status
        };

        if (formData.phone) updateData.phone = formData.phone;
        if (formData.password) updateData.password = formData.password;

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
          throw new Error(errorData.error || errorData.details || 'Erro ao atualizar usuário');
        }

      } else {
        // Criar novo usuário via /api/users (que cria no Auth com user_metadata)
        const createData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          phone: formData.phone,
          password: formData.password
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
          throw new Error(errorData.error || errorData.details || 'Erro ao criar usuário');
        }
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
                  <option value="recepcao">Recepção</option>
                  <option value="atendente">Atendente</option>
                  <option value="admin">Administrador</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                <p className="text-xs text-slate-500">
                  {formData.role === 'superadmin' && 'Acesso total ao sistema.'}
                  {formData.role === 'admin' && 'Gerencia usuários e atendimentos.'}
                  {formData.role === 'atendente' && 'Gerencia apenas atendimentos.'}
                  {formData.role === 'recepcao' && 'Apenas agendamentos do dia.'}
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
