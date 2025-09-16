"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase-client';

interface UserSettings {
  notifications: {
    email: boolean;
    browser: boolean;
    appointments: boolean;
    reminders: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'pt' | 'en';
    timezone: string;
    dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
    showPhone: boolean;
  };
}

interface UserSettingsModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserSettingsModal({ show, onClose, onSuccess }: UserSettingsModalProps) {
  const [authUser, setAuthUser] = useState<any>(null);
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      browser: true,
      appointments: true,
      reminders: true
    },
    preferences: {
      theme: 'light',
      language: 'pt',
      timezone: 'America/Fortaleza',
      dateFormat: 'dd/mm/yyyy'
    },
    privacy: {
      profileVisibility: 'private',
      showEmail: false,
      showPhone: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences' | 'privacy'>('notifications');

  // Carregar configurações do usuário
  useEffect(() => {
    if (show) {
      loadAuthUser();
    }
  }, [show]);

  useEffect(() => {
    if (authUser) {
      loadUserSettings();
    }
  }, [authUser]);

  const loadAuthUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUser(user);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  };

  const loadUserSettings = async () => {
    if (!authUser?.id) return;

    setLoading(true);
    try {
      // Buscar configurações salvas (se existirem)
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (data && !error) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.log('Configurações não encontradas, usando padrão');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.id) return;

    setSaving(true);
    setMessage('');

    try {
      // Verificar se já existe configuração
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', authUser.id)
        .single();

      const settingsData = {
        user_id: authUser.id,
        settings: settings,
        updated_at: new Date().toISOString()
      };

      if (existingSettings) {
        // Atualizar configurações existentes
        const { error } = await supabase
          .from('user_settings')
          .update(settingsData)
          .eq('user_id', authUser.id);

        if (error) throw error;
      } else {
        // Criar novas configurações
        const { error } = await supabase
          .from('user_settings')
          .insert([{
            ...settingsData,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      setMessage('Configurações salvas com sucesso!');
      setTimeout(() => {
        onSuccess();
        setMessage('');
      }, 1500);

    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setMessage('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!authUser?.email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authUser.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      
      setMessage('E-mail de redefinição de senha enviado!');
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      setMessage('Erro ao enviar e-mail de redefinição.');
    }
  };

  if (!show) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto my-4 relative border border-gray-100 max-h-[90vh] min-h-[60vh] overflow-hidden flex flex-col">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none z-10"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
          <div className="flex items-center">
            <div className="bg-white/20 p-3 rounded-xl mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Configurações</h2>
              <p className="text-blue-100">Personalize sua experiência no sistema</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex px-8">
            {[
              { id: 'notifications', label: 'Notificações', icon: 'M15 17h5l-5 5v-5z M10.894 2.553a1 1 0 00-.894 0l-7 4a1 1 0 000 1.788L7 10.382V18a1 1 0 001 1h8a1 1 0 001-1v-7.618l4.106-2.041a1 1 0 000-1.788l-7-4z' },
              { id: 'preferences', label: 'Preferências', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4' },
              { id: 'privacy', label: 'Privacidade', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Carregando configurações...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {message && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border text-sm font-medium ${
                  message.includes('sucesso')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {message.includes('sucesso') ? (
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span>{message}</span>
                </div>
              )}

              {/* Tab Notifications */}
              {activeTab === 'notifications' && (
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Notificações</h3>
                  
                  {[
                    { key: 'email', label: 'Notificações por E-mail', desc: 'Receber notificações importantes por e-mail' },
                    { key: 'browser', label: 'Notificações do Navegador', desc: 'Mostrar notificações no navegador quando disponível' },
                    { key: 'appointments', label: 'Lembretes de Agendamentos', desc: 'Receber lembretes sobre agendamentos próximos' },
                    { key: 'reminders', label: 'Lembretes Gerais', desc: 'Receber lembretes sobre tarefas e eventos importantes' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                        <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                          onChange={(e) => handleSettingChange('notifications', item.key, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab Preferences */}
              {activeTab === 'preferences' && (
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferências do Sistema</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
                      <select
                        value={settings.preferences.theme}
                        onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                      >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                        <option value="system">Sistema</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                      <select
                        value={settings.preferences.language}
                        onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                      >
                        <option value="pt">Português</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fuso Horário</label>
                      <select
                        value={settings.preferences.timezone}
                        onChange={(e) => handleSettingChange('preferences', 'timezone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                      >
                        <option value="America/Fortaleza">Fortaleza (GMT-3)</option>
                        <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                        <option value="America/Manaus">Manaus (GMT-4)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Formato de Data</label>
                      <select
                        value={settings.preferences.dateFormat}
                        onChange={(e) => handleSettingChange('preferences', 'dateFormat', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                      >
                        <option value="dd/mm/yyyy">DD/MM/AAAA</option>
                        <option value="mm/dd/yyyy">MM/DD/AAAA</option>
                        <option value="yyyy-mm-dd">AAAA-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Privacy */}
              {activeTab === 'privacy' && (
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Privacidade</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">Visibilidade do Perfil</h4>
                          <p className="text-sm text-gray-500 mt-1">Controlar quem pode ver suas informações de perfil</p>
                        </div>
                        <select
                          value={settings.privacy.profileVisibility}
                          onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                          className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        >
                          <option value="private">Privado</option>
                          <option value="public">Público</option>
                        </select>
                      </div>
                    </div>
                    
                    {[
                      { key: 'showEmail', label: 'Mostrar E-mail', desc: 'Permitir que outros usuários vejam seu e-mail' },
                      { key: 'showPhone', label: 'Mostrar Telefone', desc: 'Permitir que outros usuários vejam seu telefone' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                          <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.privacy[item.key as keyof typeof settings.privacy]}
                            onChange={(e) => handleSettingChange('privacy', item.key, e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-200 pt-5">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Segurança da Conta</h4>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 01-2 2m2-2h.01M9 9h1m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Alterar Senha
                    </button>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Salvar Configurações
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

  // Usar portal se estivermos no cliente
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
