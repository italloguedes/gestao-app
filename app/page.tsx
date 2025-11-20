'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AUTH_CONFIG } from '../lib/auth-config';
import { validatePassword, validateEmail, handleAuthError } from '../lib/auth-utils';
import { supabase, checkSupabaseConnection, handleSupabaseError } from '../lib/supabase-client';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';

// Campo de input reutilizável
function InputField({
  id, label, type, value, onChange, required = true, autoComplete, placeholder,
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-gray-700 mb-2">
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
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white"
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
          redirectTo: `${window.location.origin}/auth/callback/reset-password`,
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
          // Força um refresh na sessão para atualizar o tempo de expiração
          await supabase.auth.refreshSession();
          
          // Armazena o timestamp de quando a sessão deve expirar (2 horas)
          localStorage.setItem('session-expiry', String(Date.now() + 7200000)); // 2 horas em milissegundos

          // Verifica a role do usuário para redirecionar corretamente
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('email', email)
            .single();

          if (userError) {
            console.error('Erro ao buscar dados do usuário:', userError);
            router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
            return;
          }

          // Redireciona baseado na role
          if (userData?.role === 'admin' || userData?.role === 'atendente' || userData?.role === 'superadmin') {
            router.push(AUTH_CONFIG.REDIRECT_URLS.DASHBOARD);
          } else {
            router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
          }
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

  // Login com Google
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      setError('Erro ao fazer login com Google. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gray-100 overflow-hidden">
      {/* Peças de quebra-cabeça animadas */}
      <div className="absolute top-10 left-10 w-20 h-20 text-gray-300 float-1">
        <svg viewBox="0 0 100 100" className="fill-current">
          <path d="M50 0 C30 0 15 15 15 30 L15 50 C15 50 5 50 5 60 C5 70 15 70 15 70 L15 85 C15 92 22 100 30 100 L50 100 C50 100 50 90 60 90 C70 90 70 100 70 100 L85 100 C92 100 100 92 100 85 L100 50 L100 30 C100 15 92 0 85 0 L70 0 C70 0 70 10 60 10 C50 10 50 0 50 0 Z" />
        </svg>
      </div>
      <div className="absolute bottom-20 right-20 w-24 h-24 text-gray-300 float-2">
        <svg viewBox="0 0 100 100" className="fill-current">
          <path d="M50 0 C30 0 15 15 15 30 L15 50 C15 50 5 50 5 60 C5 70 15 70 15 70 L15 85 C15 92 22 100 30 100 L50 100 C50 100 50 90 60 90 C70 90 70 100 70 100 L85 100 C92 100 100 92 100 85 L100 50 L100 30 C100 15 92 0 85 0 L70 0 C70 0 70 10 60 10 C50 10 50 0 50 0 Z" />
        </svg>
      </div>
      <div className="absolute top-1/3 right-10 w-16 h-16 text-gray-300 float-3">
        <svg viewBox="0 0 100 100" className="fill-current">
          <path d="M50 0 C30 0 15 15 15 30 L15 50 C15 50 5 50 5 60 C5 70 15 70 15 70 L15 85 C15 92 22 100 30 100 L50 100 C50 100 50 90 60 90 C70 90 70 100 70 100 L85 100 C92 100 100 92 100 85 L100 50 L100 30 C100 15 92 0 85 0 L70 0 C70 0 70 10 60 10 C50 10 50 0 50 0 Z" />
        </svg>
      </div>
      <div className="absolute bottom-1/3 left-20 w-16 h-16 text-gray-300 float-4">
        <svg viewBox="0 0 100 100" className="fill-current">
          <path d="M50 0 C30 0 15 15 15 30 L15 50 C15 50 5 50 5 60 C5 70 15 70 15 70 L15 85 C15 92 22 100 30 100 L50 100 C50 100 50 90 60 90 C70 90 70 100 70 100 L85 100 C92 100 100 92 100 85 L100 50 L100 30 C100 15 92 0 85 0 L70 0 C70 0 70 10 60 10 C50 10 50 0 50 0 Z" />
        </svg>
      </div>

      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl z-10">
        <div className="flex flex-col items-center space-y-4">
          <Image
            src="/logoautismo.png"
            alt="Logo CIADI"
            width={100}
            height={100}
            className="object-contain"
            priority
          />
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">
              {isRecovering ? 'Recuperar Senha' : isRegistering ? 'Criar Conta' : 'Bem-vindo'}
            </h2>
            <p className="text-gray-500">
              {isRecovering
                ? 'Insira seu email para recuperar o acesso.'
                : isRegistering
                ? 'Crie sua conta para começar.'
                : 'Faça login para continuar.'}
            </p>
          </div>
        </div>
        <form onSubmit={handleAuth} className="w-full space-y-4">
          <InputField
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="seu.email@provedor.com"
          />

          {!isRecovering && (
            <InputField
              id="password"
              type="password"
              label="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              placeholder="••••••••"
            />
          )}

          {isRegistering && (
            <InputField
              id="confirmPassword"
              type="password"
              label="Confirmar Senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          )}

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`w-full py-3 rounded-xl text-white font-semibold transition-all duration-300 shadow-md focus:outline-none focus:ring-4 focus:ring-blue-200 ${
              isSubmitDisabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {loading
              ? 'Processando...'
              : isRecovering
              ? 'Enviar Email'
              : isRegistering
              ? 'Criar Conta'
              : 'Entrar'}
          </button>
        </form>

        {!isRecovering && !isRegistering && (
          <>
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-xs font-semibold text-gray-400">OU</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center justify-center space-x-3 disabled:opacity-50"
            >
              <FcGoogle className="text-xl" />
              <span className="font-semibold text-gray-600">
                Continuar com Google
              </span>
            </button>
          </>
        )}

        <div className="mt-4 flex flex-col items-center space-y-2">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
            {!isRecovering && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                    setMessage(null);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {isRegistering ? 'Já tem conta? Entre' : 'Criar nova conta'}
                </button>
                <span className="hidden sm:inline text-gray-300">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovering(true);
                    setError(null);
                    setMessage(null);
                  }}
                  className="font-semibold text-gray-500 hover:text-gray-600 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </>
            )}
            {isRecovering && (
              <button
                type="button"
                onClick={() => {
                  setIsRecovering(false);
                  setError(null);
                  setMessage(null);
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Voltar ao login
              </button>
            )}
          </div>
        </div>
      </div>
      <footer className="w-full py-4 text-center text-xs text-gray-500 absolute bottom-0 z-10">
        <p>
          © {new Date().getFullYear()} Roar Projects | Desenvolvido por Itallo Guedes
        </p>
      </footer>
    </div>
  );
}
