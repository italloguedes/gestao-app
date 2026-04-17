'use client';

import React, { useState } from 'react';
import { User } from '@/lib/models/User';
import { supabase } from '@/lib/supabase-client';
import { FiUser, FiMail, FiShield, FiToggleRight, FiAlertCircle, FiRefreshCw, FiPhone, FiLock, FiSave, FiX, FiUserPlus, FiBriefcase, FiHash, FiImage, FiUpload } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  funcao?: string;
  matricula?: string;
  assinatura_url?: string;
};

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'user',
    status: user?.status || 'active',
    password: '',
    funcao: user?.funcao || '',
    matricula: user?.matricula || '',
    assinatura_url: user?.assinatura_url || ''
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingSignature(true);
      setError(null);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      if (file.size > 2 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 2MB');

      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) throw new Error('Use PNG, JPG ou WebP');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');

      const form = new FormData();
      form.append('file', file);

      const response = await fetch('/api/upload-assinatura', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro no upload');

      setFormData(prev => ({ ...prev, assinatura_url: result.publicUrl }));
    } catch (err: any) {
      setError(err.message || 'Erro no upload da assinatura');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

      if (!user && (!formData.password || formData.password.length < 6)) {
        throw new Error('Senha obrigatória (mínimo 6 caracteres)');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      if (user?.id) {
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          funcao: formData.funcao,
          matricula: formData.matricula,
          assinatura_url: formData.assinatura_url
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
        const createData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          phone: formData.phone,
          password: formData.password,
          funcao: formData.funcao,
          matricula: formData.matricula,
          assinatura_url: formData.assinatura_url
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
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-3 duration-300">
      {/* Top gradient bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />

      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              {user ? <FiUser className="h-5 w-5 text-white" /> : <FiUserPlus className="h-5 w-5 text-white" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {user ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <p className="text-sm text-gray-500">
                {user ? 'Atualize as informações e permissões' : 'Preencha os dados do novo membro'}
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3.5 flex items-start gap-3">
              <FiAlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Erro ao salvar</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Personal Info */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Informações Pessoais</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <FiUser className="text-gray-400 h-3.5 w-3.5" /> Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: João Silva"
                  className="h-10 rounded-lg border-gray-200 focus:border-emerald-400 focus:ring-emerald-100"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <FiMail className="text-gray-400 h-3.5 w-3.5" /> Email <span className="text-red-500">*</span>
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="joao@exemplo.com"
                  className="h-10 rounded-lg border-gray-200 focus:border-emerald-400 focus:ring-emerald-100"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <FiPhone className="text-gray-400 h-3.5 w-3.5" /> Telefone
              </label>
              <Input
                name="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
                className="h-10 rounded-lg border-gray-200 focus:border-emerald-400 focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <FiLock className="text-gray-400 h-3.5 w-3.5" /> Senha {!user && <span className="text-red-500">*</span>}
              </label>
              <Input
                name="password"
                type="password"
                value={formData.password || ''}
                onChange={handleChange}
                placeholder={user ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                className="h-10 rounded-lg border-gray-200 focus:border-emerald-400 focus:ring-emerald-100"
                required={!user}
                minLength={6}
              />
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Dados do Servidor */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Dados do Servidor</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <FiBriefcase className="text-gray-400 h-3.5 w-3.5" /> Função
                </label>
                <Input
                  name="funcao"
                  value={formData.funcao || ''}
                  onChange={handleChange}
                  placeholder="Ex: Técnico Legislativo"
                  className="h-10 rounded-lg border-gray-200 focus:border-emerald-400 focus:ring-emerald-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <FiHash className="text-gray-400 h-3.5 w-3.5" /> Matrícula
                </label>
                <Input
                  name="matricula"
                  value={formData.matricula || ''}
                  onChange={handleChange}
                  placeholder="Ex: 12345"
                  className="h-10 rounded-lg border-gray-200 focus:border-emerald-400 focus:ring-emerald-100"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
                <FiImage className="text-gray-400 h-3.5 w-3.5" /> Assinatura para PDF
              </label>
              <div className="flex items-center gap-3">
                <Input
                  name="assinatura_url"
                  value={formData.assinatura_url || ''}
                  onChange={handleChange}
                  placeholder="Ex: /assinatura-italo.png ou URL da imagem"
                  className="h-10 rounded-lg border-gray-200 focus:border-emerald-400 focus:ring-emerald-100 flex-1"
                />
                <div className="relative">
                  <input 
                    type="file" 
                    onChange={handleSignatureUpload} 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingSignature}
                  />
                  <Button type="button" variant="outline" className="h-10 px-4 rounded-xl flex items-center gap-2" disabled={uploadingSignature}>
                    {uploadingSignature ? <FiRefreshCw className="animate-spin w-4 h-4" /> : <FiUpload className="w-4 h-4" />}
                    <span>Upload</span>
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Dica: Você pode digitar "/assinatura-italo.png" para usar uma assinatura já existente no sistema.</p>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Permissões</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <FiShield className="text-gray-400 h-3.5 w-3.5" /> Função
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full h-10 rounded-lg border border-gray-200 bg-white text-sm px-3 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                >
                  <option value="user">Usuário (Padrão)</option>
                  <option value="recepcao">Recepção</option>
                  <option value="atendente">Atendente</option>
                  <option value="admin">Administrador</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                <p className="text-xs text-gray-400">
                  {formData.role === 'superadmin' && 'Acesso total ao sistema.'}
                  {formData.role === 'admin' && 'Gerencia usuários e atendimentos.'}
                  {formData.role === 'atendente' && 'Gerencia apenas atendimentos.'}
                  {formData.role === 'recepcao' && 'Apenas agendamentos do dia.'}
                  {formData.role === 'user' && 'Apenas agendamento.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <FiToggleRight className="text-gray-400 h-3.5 w-3.5" /> Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full h-10 rounded-lg border border-gray-200 bg-white text-sm px-3 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="h-10 px-5 rounded-xl border-gray-200">
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-200/50 transition-all font-semibold"
            >
              {loading ? (
                <FiRefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <FiSave className="mr-2 h-4 w-4" />
                  {user ? 'Salvar Alterações' : 'Criar Usuário'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
