"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase-client';
import { FiCamera, FiUser, FiLock, FiPhone, FiMail, FiEdit2 } from 'react-icons/fi';

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  funcao?: string;
  matricula?: string;
}

interface UserProfileModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserProfileModal({ show, onClose, onSuccess }: UserProfileModalProps) {
  const [authUser, setAuthUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    avatar_url: '',
    role: 'user',
    funcao: '',
    matricula: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      loadUserProfile();
    }
  }, [show]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthUser(user);
        setProfile({
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          phone: user.phone || user.user_metadata?.phone || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          role: user.user_metadata?.role || 'user',
          funcao: user.user_metadata?.funcao || '',
          matricula: user.user_metadata?.matricula || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      showMessage('Erro ao carregar perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecione uma imagem');
      }

      const file = event.target.files[0];

      // Validar tamanho (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Imagem deve ter no máximo 2MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      showMessage('Foto carregada! Clique em Salvar.', 'success');

    } catch (error: any) {
      console.error('Erro no upload:', error);
      showMessage(error.message || 'Erro no upload da imagem', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.id) return;

    setSaving(true);

    try {
      // Atualizar user_metadata no Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.name,
          name: profile.name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          funcao: profile.funcao,
          matricula: profile.matricula
        }
      });

      if (error) throw error;

      // Try to update public.users as well 
      try {
        await supabase.from('users').update({ 
          name: profile.name 
        }).eq('auth_id', authUser.id);
      } catch (e) {
        console.warn('Erro ao atualizar public.users (nao-fatal):', e);
      }

      showMessage('Perfil atualizado com sucesso!', 'success');
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      showMessage(error.message || 'Erro ao salvar perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      showMessage('Preencha todos os campos de senha', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showMessage('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage('As senhas não coincidem', 'error');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      showMessage('Senha alterada com sucesso!', 'success');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);

    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      showMessage(error.message || 'Erro ao alterar senha', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      atendente: 'Atendente',
      user: 'Usuário'
    };
    return labels[role] || role;
  };

  if (!show) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto relative border border-gray-100 max-h-[90vh] overflow-hidden flex flex-col">

        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header com Avatar */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-8 text-white text-center">
          <div className="relative inline-block group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-28 h-28 rounded-full border-4 border-white/30 overflow-hidden bg-white shadow-xl mx-auto">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                  <FiUser className="w-12 h-12" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                ) : (
                  <FiCamera className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <h2 className="text-xl font-bold mt-4">{profile.name || 'Meu Perfil'}</h2>
          <p className="text-emerald-100 text-sm">{profile.email}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
            {getRoleLabel(profile.role)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Message */}
              {message && (
                <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${messageType === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                  {messageType === 'success' ? (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span>{message}</span>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FiUser className="text-gray-400" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition bg-gray-50"
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FiPhone className="text-gray-400" />
                  Telefone
                </label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition bg-gray-50"
                  placeholder="(85) 99999-9999"
                />
              </div>

              {/* Função e Matrícula */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                     Função
                  </label>
                  <input
                    type="text"
                    value={profile.funcao || ''}
                    onChange={(e) => handleInputChange('funcao', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition bg-gray-50"
                    placeholder="Ex: Técnico Legislativo"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                     Matrícula
                  </label>
                  <input
                    type="text"
                    value={profile.matricula || ''}
                    onChange={(e) => handleInputChange('matricula', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition bg-gray-50"
                    placeholder="Ex: 12345"
                  />
                </div>
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FiMail className="text-gray-400" />
                  E-mail
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado</p>
              </div>

              {/* Password Section */}
              <div className="border-t border-gray-100 pt-5">
                {!showPasswordSection ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordSection(true)}
                    className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition"
                  >
                    <FiLock className="w-4 h-4" />
                    Alterar Senha
                  </button>
                ) : (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-700 flex items-center gap-2">
                        <FiLock className="w-4 h-4" />
                        Alterar Senha
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordSection(false);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Nova Senha</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Confirmar Senha</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
                        placeholder="Repita a nova senha"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handlePasswordChange}
                      disabled={changingPassword}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {changingPassword ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Alterando...
                        </>
                      ) : (
                        'Alterar Senha'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-200"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
