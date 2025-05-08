'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AUTH_CONFIG } from '../lib/auth-config';
import { validatePassword, validateEmail, handleAuthError } from '../lib/auth-utils';
import { supabase, checkSupabaseConnection, handleSupabaseError } from '../lib/supabase-client';

// Campo de input reutilizável
function InputField({
  id, label, type, value, onChange, required = true, autoComplete, placeholder,
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white/50 backdrop-blur-sm"
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const router = useRouter();

  // Verifica a conexão com o Supabase ao carregar a página
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkSupabaseConnection();
      setIsConnected(connected);
      if (!connected) {
        setError('Erro de conexão com o servidor. Por favor, tente novamente mais tarde.');
      }
    };
    checkConnection();
  }, []);

  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Erro de conexão com o servidor. Por favor, tente novamente mais tarde.');
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      // Validação de email
      if (!validateEmail(email)) {
        setError(AUTH_CONFIG.ERROR_MESSAGES.INVALID_EMAIL);
        setLoading(false);
        return;
      }

      if (isRecovering) {
        const { error: recoverError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${AUTH_CONFIG.REDIRECT_URLS.RESET_PASSWORD}`,
        });

        if (recoverError) throw recoverError;
        setMessage('Email de recuperação enviado. Verifique sua caixa de entrada.');
        setIsRecovering(false);
        return;
      }

      if (isRegistering) {
        // Validação de senha
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          setError(passwordValidation.message || AUTH_CONFIG.ERROR_MESSAGES.WEAK_PASSWORD);
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError(AUTH_CONFIG.ERROR_MESSAGES.PASSWORDS_DONT_MATCH);
          setLoading(false);
          return;
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${AUTH_CONFIG.REDIRECT_URLS.EMAIL_CONFIRMATION}`,
            data: {
              email,
              status: 'active'
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData?.user) {
          setMessage('Verifique seu email para confirmar o cadastro');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });

        if (signInError) throw signInError;

        if (data.session) {
          router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
        }
      }
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, isRegistering, isRecovering, router, isConnected]);

  // Desabilita o botão se campos obrigatórios não estão preenchidos
  const isSubmitDisabled = loading || !email || !password || (isRegistering && !confirmPassword);

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-white overflow-hidden">
      {/* Bolhas coloridas decorativas */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#23B4E7] opacity-20 rounded-full blur-3xl z-0" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#3AC28D] opacity-20 rounded-full blur-3xl z-0" />
      <div className="absolute top-1/2 left-0 w-40 h-40 bg-[#FFA726] opacity-20 rounded-full blur-2xl z-0" />
      <div className="absolute bottom-0 right-1/2 w-32 h-32 bg-[#FFD600] opacity-20 rounded-full blur-2xl z-0" />

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center relative z-10">
        {/* Card do formulário */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-12 z-10">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border-t-8 border-b-8 border-[#23B4E7] flex flex-col gap-6">
            <div className="flex flex-col items-center mb-2">
              <Image
                src="/logoautismo.png"
                alt="Logo CIADI"
                width={130}
                height={130}
                className="object-contain mb-2"
                priority
              />
            </div>
            <h2 className="text-2xl font-bold text-center" style={{ color: '#23B4E7' }}>
              {isRecovering ? 'Recuperar Senha' : isRegistering ? 'Criar nova conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-center" style={{ color: '#8A9A91' }}>
              {isRecovering
                ? 'Digite seu email para receber as instruções de recuperação'
                : isRegistering
                ? 'Preencha seus dados para começar'
                : 'Entre com suas credenciais para acessar o sistema'}
            </p>
            {error && (
              <div className="mb-2 p-3 bg-[#FFA726]/20 border-l-4 border-[#FFA726] rounded text-[#FFA726] text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-2 p-3 bg-[#3AC28D]/20 border-l-4 border-[#3AC28D] rounded text-[#3AC28D] text-sm">
                {message}
              </div>
            )}
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm mb-1 font-semibold" style={{ color: '#23B4E7' }}>Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-[#E3F7FD] border border-[#23B4E7] focus:border-[#3AC28D] focus:outline-none"
                  placeholder="seu@email.com"
                />
              </div>
              {!isRecovering && (
                <div>
                  <label htmlFor="password" className="block text-sm mb-1 font-semibold" style={{ color: '#23B4E7' }}>Senha</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-[#E3F7FD] border border-[#23B4E7] focus:border-[#3AC28D] focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              )}
              {isRegistering && !isRecovering && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm mb-1 font-semibold" style={{ color: '#23B4E7' }}>Confirmar Senha</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-[#E3F7FD] border border-[#23B4E7] focus:border-[#3AC28D] focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#FFA726] via-[#FFD600] to-[#3AC28D] hover:from-[#FFA726] hover:to-[#23B4E7] text-white font-bold py-2 rounded-lg shadow-md transition disabled:opacity-50"
              >
                {loading ? 'Processando...' : isRecovering ? 'Enviar Email' : isRegistering ? 'Criar Conta' : 'Entrar'}
              </button>
            </form>
            <div className="text-center mt-2 space-y-2">
              {!isRecovering && (
                <button
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                    setMessage(null);
                  }}
                  className="font-semibold underline"
                  style={{ color: '#3AC28D' }}
                  type="button"
                >
                  {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
                </button>
              )}
              {!isRegistering && !isRecovering && (
                <button
                  onClick={() => {
                    setIsRecovering(true);
                    setError(null);
                    setMessage(null);
                  }}
                  className="font-semibold underline block w-full"
                  style={{ color: '#FFA726' }}
                  type="button"
                >
                  Esqueceu sua senha?
                </button>
              )}
              {isRecovering && (
                <button
                  onClick={() => {
                    setIsRecovering(false);
                    setError(null);
                    setMessage(null);
                  }}
                  className="font-semibold underline"
                  style={{ color: '#3AC28D' }}
                  type="button"
                >
                  Voltar para o login
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block h-[70%] w-1 border-l-2 border-[#23B4E7] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 rounded-full shadow-lg" />

        {/* Card do destaque */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-12 z-10">
          <div className="w-full max-w-xl text-center bg-white/80 rounded-3xl shadow-2xl p-10 border-t-8 border-b-8 border-[#3AC28D] flex flex-col items-center gap-6">
            <Image
              src="/logoautismo.png"
              alt="Logo CIADI"
              width={120}
              height={120}
              className="object-contain mb-4"
              priority
            />
            <svg className="mx-auto mb-4" width="60" height="60" viewBox="0 0 48 48" fill="none">
              <text x="0" y="40" fontSize="48" fill="#FFA726">“</text>
            </svg>
            <p className="text-2xl font-light mb-4" style={{ color: '#23B4E7' }}>
              Bem-vindo à plataforma dedicada ao gerenciamento da Sala Sensorial / ALECE.<br />
              Nossa missão é proporcionar um ambiente acolhedor e organizado para o desenvolvimento e acompanhamento das atividades.
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-medium" style={{ color: '#3AC28D' }}>Centro Inclusivo para Atendimento e Desenvolvimento Infantil</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}