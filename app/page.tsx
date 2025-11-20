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
    <div className="min-h-screen w-full animated-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        {/* Coluna da Esquerda: Formulário de Login */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            <div className="flex flex-col items-center mb-6">
              <Image
                src="/logoautismo.png"
                alt="Logo CIADI"
                width={80}
                height={80}
                className="object-contain mb-4"
                priority
              />
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white">
                  {isRecovering ? 'Recuperar Senha' : isRegistering ? 'Criar Conta' : 'Bem-vindo de volta'}
                </h2>
                <p className="text-slate-400 mt-2">
                  {isRecovering
                    ? 'Insira seu email para redefinir sua senha.'
                    : isRegistering
                    ? 'Preencha os campos para criar sua conta.'
                    : 'Acesse sua conta para continuar.'}
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
                <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg text-sm">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full py-3 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-cyan-300/50 ${
                  isSubmitDisabled
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 hover:shadow-cyan-500/40 hover:-translate-y-0.5'
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
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-slate-700"></div>
                  <span className="px-4 text-xs font-semibold text-slate-400">OU</span>
                  <div className="flex-1 border-t border-slate-700"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-all duration-300 shadow-md flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  <FcGoogle className="text-xl" />
                  <span className="font-semibold text-white">
                    Continuar com Google
                  </span>
                </button>
              </>
            )}

            <div className="mt-6 text-center">
              {!isRecovering && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(!isRegistering); setError(null); setMessage(null); }}
                    className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    {isRegistering ? 'Já tem conta? Entre' : 'Criar nova conta'}
                  </button>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => { setIsRecovering(true); setError(null); setMessage(null); }}
                    className="font-semibold text-slate-400 hover:text-slate-300 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}
              {isRecovering && (
                <button
                  type="button"
                  onClick={() => { setIsRecovering(false); setError(null); setMessage(null); }}
                  className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  Voltar ao login
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Destaque */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 bg-slate-900/50 flex flex-col justify-center items-center text-center">
           <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <Image
                src="/logoautismo.png"
                alt="Logo CIADI"
                width={130}
                height={130}
                className="object-contain relative z-10"
                priority
              />
            </div>
          <h3 className="text-3xl font-bold text-white mt-6">
            Sala Sensorial ALECE
          </h3>
          <p className="text-slate-300 mt-4 leading-relaxed">
            Um espaço de acolhimento e desenvolvimento para crianças com autismo, síndrome de Down e TDAH.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <span className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-semibold border border-cyan-500/30">
              Inclusão
            </span>
            <span className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-full text-sm font-semibold border border-purple-500/30">
              Acolhimento
            </span>
            <span className="px-4 py-2 bg-pink-500/20 text-pink-300 rounded-full text-sm font-semibold border border-pink-500/30">
              Desenvolvimento
            </span>
          </div>
           <div className="w-full border-t border-dashed border-slate-700 my-8"></div>
           <p className="text-slate-400 mb-4">Se você já tem um agendamento, pode consultar o status aqui:</p>
          <Link
            href="/consulta"
            className="group flex items-center justify-center px-6 py-3 rounded-xl font-bold border-2 border-green-500 bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-all duration-300 w-full max-w-xs hover:scale-105 shadow-lg hover:shadow-green-500/30"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Consultar Documento
          </Link>
        </div>
      </div>
      <footer className="w-full py-4 text-center text-xs text-slate-400 absolute bottom-0 z-10">
        <p>
          © {new Date().getFullYear()} Roar Projects | Desenvolvido por Itallo Guedes
        </p>
      </footer>
    </div>
  );
}
