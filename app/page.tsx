'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AUTH_CONFIG } from '../lib/auth-config';
import { validatePassword, validateEmail, handleAuthError } from '../lib/auth-utils';
import { supabase, checkSupabaseConnection, handleSupabaseError } from '../lib/supabase-client';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';
import { FaPuzzlePiece, FaHandsHelping, FaInfinity } from 'react-icons/fa';

// Campo de input reutilizável com design acessível
function InputField({
  id, label, type, value, onChange, required = true, autoComplete, placeholder,
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-600 mb-2 pl-1">
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
          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all duration-300 bg-slate-50 text-slate-700 placeholder-slate-400 shadow-sm hover:border-teal-200"
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
        
        {/* Left Column: Login Form */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white/40">
          <div className="w-full max-w-md mx-auto">
            <div className="flex flex-col items-center mb-8">
              <div className="relative w-24 h-24 mb-6 p-4 bg-white rounded-full shadow-lg flex items-center justify-center">
                 <Image
                  src="/logoautismo.png"
                  alt="Logo CIADI"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
              
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                  {isRecovering ? 'Recuperar Acesso' : isRegistering ? 'Criar Conta' : 'Bem-vindo'}
                </h2>
                <p className="text-slate-500 text-lg">
                  {isRecovering
                    ? 'Vamos ajudar você a recuperar sua senha.'
                    : isRegistering
                      ? 'Junte-se a nós neste espaço seguro.'
                      : 'Você está em um espaço seguro.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleAuth} className="w-full space-y-5">
              <InputField
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="seu.email@exemplo.com"
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
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center">
                  <span className="mr-2">⚠️</span> {error}
                </div>
              )}

              {message && (
                <div className="bg-teal-50 border border-teal-100 text-teal-700 px-4 py-3 rounded-xl text-sm flex items-center">
                  <span className="mr-2">✅</span> {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-teal-200 ${isSubmitDisabled
                  ? 'bg-slate-300 cursor-not-allowed shadow-none transform-none'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600'
                  }`}
              >
                {loading
                  ? 'Processando...'
                  : isRecovering
                    ? 'Enviar Instruções'
                    : isRegistering
                      ? 'Criar Minha Conta'
                      : 'Entrar no Sistema'}
              </button>
            </form>

            {!isRecovering && !isRegistering && (
              <>
                <div className="flex items-center my-8">
                  <div className="flex-1 border-t border-slate-200"></div>
                  <span className="px-4 text-sm font-medium text-slate-400">OU</span>
                  <div className="flex-1 border-t border-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-white border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all duration-300 text-slate-600 font-semibold flex items-center justify-center space-x-3 group"
                >
                  <FcGoogle className="text-2xl group-hover:scale-110 transition-transform" />
                  <span>Continuar com Google</span>
                </button>
              </>
            )}

            <div className="mt-8 text-center space-y-4">
              {!isRecovering && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(!isRegistering); setError(null); setMessage(null); }}
                    className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                  >
                    {isRegistering ? 'Já tenho uma conta' : 'Criar nova conta'}
                  </button>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => { setIsRecovering(true); setError(null); setMessage(null); }}
                    className="font-medium text-slate-500 hover:text-slate-700 hover:underline transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
              {isRecovering && (
                <button
                  type="button"
                  onClick={() => { setIsRecovering(false); setError(null); setMessage(null); }}
                  className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                >
                  Voltar para o login
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Feature/Welcome */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex flex-col justify-center items-center text-center relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-200/30 rounded-full blur-3xl -ml-16 -mb-16"></div>
          
          <div className="relative z-10 max-w-md">
            <div className="mb-8 flex justify-center space-x-4">
               <div className="p-3 bg-white rounded-2xl shadow-sm text-teal-500">
                 <FaPuzzlePiece size={32} />
               </div>
               <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-500">
                 <FaHandsHelping size={32} />
               </div>
               <div className="p-3 bg-white rounded-2xl shadow-sm text-purple-500">
                 <FaInfinity size={32} />
               </div>
            </div>

            <h3 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 leading-tight">
              Sala Sensorial <span className="text-teal-600">ALECE</span>
            </h3>
            
            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
              Um ambiente projetado com carinho para o desenvolvimento e acolhimento de crianças com autismo, síndrome de Down e TDAH.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <span className="px-4 py-2 bg-white/60 backdrop-blur-sm text-teal-700 rounded-full text-sm font-bold border border-teal-100 shadow-sm">
                💙 Inclusão
              </span>
              <span className="px-4 py-2 bg-white/60 backdrop-blur-sm text-blue-700 rounded-full text-sm font-bold border border-blue-100 shadow-sm">
                🤝 Acolhimento
              </span>
              <span className="px-4 py-2 bg-white/60 backdrop-blur-sm text-purple-700 rounded-full text-sm font-bold border border-purple-100 shadow-sm">
                ✨ Desenvolvimento
              </span>
            </div>

            <div className="w-full border-t border-dashed border-slate-300 my-8"></div>
            
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/60 shadow-sm">
              <p className="text-slate-600 mb-4 font-medium">Já realizou um atendimento?</p>
              <Link
                href="/consulta"
                className="flex items-center justify-center px-6 py-3.5 rounded-xl font-bold bg-white text-teal-600 border-2 border-teal-100 hover:border-teal-300 hover:bg-teal-50 transition-all duration-300 shadow-sm hover:shadow-md group"
              >
                <svg
                  className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform"
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
                Consultar Status do Atendimento
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="fixed bottom-4 w-full text-center text-xs text-slate-400 pointer-events-none">
        <p>© {new Date().getFullYear()} Roar Projects | Desenvolvido por Itallo Guedes</p>
      </footer>
    </div>
  );
}
