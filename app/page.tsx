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
          if (userData?.role === 'admin' || userData?.role === 'atendente') {
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
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Peças de quebra-cabeça decorativas (símbolo do autismo) */}
      <div className="absolute top-10 left-10 w-20 h-20 opacity-10">
        <svg viewBox="0 0 100 100" className="text-blue-500 fill-current">
          <path d="M50 0 C30 0 15 15 15 30 L15 50 C15 50 5 50 5 60 C5 70 15 70 15 70 L15 85 C15 92 22 100 30 100 L50 100 C50 100 50 90 60 90 C70 90 70 100 70 100 L85 100 C92 100 100 92 100 85 L100 50 L100 30 C100 15 92 0 85 0 L70 0 C70 0 70 10 60 10 C50 10 50 0 50 0 Z" />
        </svg>
      </div>
      <div className="absolute bottom-20 right-20 w-24 h-24 opacity-10 transform rotate-45">
        <svg viewBox="0 0 100 100" className="text-red-500 fill-current">
          <path d="M50 0 C30 0 15 15 15 30 L15 50 C15 50 5 50 5 60 C5 70 15 70 15 70 L15 85 C15 92 22 100 30 100 L50 100 C50 100 50 90 60 90 C70 90 70 100 70 100 L85 100 C92 100 100 92 100 85 L100 50 L100 30 C100 15 92 0 85 0 L70 0 C70 0 70 10 60 10 C50 10 50 0 50 0 Z" />
        </svg>
      </div>
      <div className="absolute top-1/3 right-10 w-16 h-16 opacity-10 transform -rotate-12">
        <svg viewBox="0 0 100 100" className="text-yellow-500 fill-current">
          <path d="M50 0 C30 0 15 15 15 30 L15 50 C15 50 5 50 5 60 C5 70 15 70 15 70 L15 85 C15 92 22 100 30 100 L50 100 C50 100 50 90 60 90 C70 90 70 100 70 100 L85 100 C92 100 100 92 100 85 L100 50 L100 30 C100 15 92 0 85 0 L70 0 C70 0 70 10 60 10 C50 10 50 0 50 0 Z" />
        </svg>
      </div>
      <div className="absolute bottom-1/3 left-20 w-16 h-16 opacity-10 transform rotate-90">
        <svg viewBox="0 0 100 100" className="text-green-500 fill-current">
          <path d="M50 0 C30 0 15 15 15 30 L15 50 C15 50 5 50 5 60 C5 70 15 70 15 70 L15 85 C15 92 22 100 30 100 L50 100 C50 100 50 90 60 90 C70 90 70 100 70 100 L85 100 C92 100 100 92 100 85 L100 50 L100 30 C100 15 92 0 85 0 L70 0 C70 0 70 10 60 10 C50 10 50 0 50 0 Z" />
        </svg>
      </div>

      {/* Estrelinhas decorativas */}
      <div className="absolute top-20 right-1/4 text-yellow-400 opacity-20 text-4xl animate-pulse">★</div>
      <div className="absolute bottom-1/4 right-10 text-pink-400 opacity-20 text-3xl animate-pulse">★</div>
      <div className="absolute top-1/2 left-10 text-blue-400 opacity-20 text-2xl animate-pulse">★</div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center relative z-10 gap-8">
        {/* Card do formulário */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-12 z-10">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border-4 border-blue-200 relative overflow-hidden">
            {/* Barra colorida do topo - cores do autismo */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-red-500 via-yellow-500 to-green-500"></div>

            <div className="flex flex-col items-center mb-4">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
                <Image
                  src="/logoautismo.png"
                  alt="Logo CIADI"
                  width={110}
                  height={110}
                  className="object-contain mb-2 relative z-10"
                  priority
                />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {isRecovering ? '🔑 Recuperar Senha' : isRegistering ? '🌟 Criar Conta' : '👋 Bem-vindo!'}
              </h2>
              <p className="text-gray-600 text-sm">
                {isRecovering
                  ? 'Vamos te ajudar a recuperar seu acesso'
                  : isRegistering
                  ? 'Junte-se a nós nessa jornada incrível'
                  : 'Que bom ter você aqui novamente'}
              </p>
            </div>
            <form onSubmit={handleAuth} className="w-full space-y-4">
              <InputField
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Digite seu email"
              />

              {!isRecovering && (
                <InputField
                  id="password"
                  type="password"
                  label="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  placeholder="Digite sua senha"
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
                  placeholder="Confirme sua senha"
                />
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`group w-full py-4 rounded-2xl text-white font-bold transition-all duration-300 shadow-lg relative overflow-hidden ${
                  isSubmitDisabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl hover:scale-105'
                }`}
              >
                {!isSubmitDisabled && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                )}
                <span className="relative z-10 flex items-center justify-center">
                  {loading
                    ? '⏳ Processando...'
                    : isRecovering
                    ? '📧 Enviar Email'
                    : isRegistering
                    ? '✨ Criar Conta'
                    : '🚀 Entrar'}
                </span>
              </button>
            </form>

            {/* Divider com "OU" */}
            {!isRecovering && !isRegistering && (
              <>
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t-2 border-gray-200"></div>
                  <span className="px-4 text-sm font-bold text-gray-500">OU</span>
                  <div className="flex-1 border-t-2 border-gray-200"></div>
                </div>

                {/* Botão Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="group w-full py-4 rounded-2xl bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                >
                  <FcGoogle className="text-2xl" />
                  <span className="font-bold text-gray-700 group-hover:text-blue-600">
                    Continuar com Google
                  </span>
                </button>
              </>
            )}

            <div className="mt-6 flex flex-col items-center space-y-3">
              <div className="w-full border-t-2 border-dashed border-gray-200"></div>

              <Link
                href="/consulta"
                className="group flex items-center justify-center px-6 py-3 rounded-2xl font-bold border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-500 hover:text-white transition-all duration-300 w-full hover:scale-105 shadow-md hover:shadow-lg"
              >
                <svg
                  className="w-5 h-5 mr-2 group-hover:animate-bounce"
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
                🔍 Consultar Documento
              </Link>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
                {!isRecovering && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-blue-600 hover:text-purple-600 font-bold hover:underline transition-colors"
                    >
                      {isRegistering ? '🔓 Já tem conta? Entre!' : '✨ Criar nova conta'}
                    </button>
                    <span className="hidden sm:inline text-gray-400">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecovering(true);
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-pink-600 hover:text-pink-700 font-bold hover:underline transition-colors"
                    >
                      🔑 Esqueceu a senha?
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
                    className="text-blue-600 hover:text-blue-700 font-bold hover:underline transition-colors"
                  >
                    ← Voltar ao login
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card do destaque */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-12 z-10">
          <div className="w-full max-w-xl text-center bg-gradient-to-br from-white to-blue-50 rounded-3xl shadow-2xl p-10 border-4 border-purple-200 flex flex-col items-center gap-6 relative overflow-hidden">
            {/* Barra colorida do topo */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500"></div>

            {/* Círculos decorativos de fundo */}
            <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-200 rounded-full opacity-20 blur-2xl"></div>
            <div className="absolute bottom-10 left-10 w-40 h-40 bg-pink-200 rounded-full opacity-20 blur-2xl"></div>

            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <Image
                src="/logoautismo.png"
                alt="Logo CIADI"
                width={130}
                height={130}
                className="object-contain relative z-10"
                priority
              />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-center gap-2 text-4xl mb-2">
                <span className="animate-bounce">🌈</span>
                <span className="animate-pulse">💙</span>
                <span className="animate-bounce">🧩</span>
              </div>

              <h3 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Sala Sensorial ALECE
              </h3>

              <p className="text-lg text-gray-700 leading-relaxed">
                <span className="font-bold text-purple-600">✨ Um espaço acolhedor e seguro</span> dedicado ao desenvolvimento e bem-estar de crianças autistas, com síndrome de Down e TDAH.
              </p>

              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold border-2 border-blue-300">
                  🧒 Inclusivo
                </span>
                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold border-2 border-purple-300">
                  ❤️ Acolhedor
                </span>
                <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-bold border-2 border-pink-300">
                  🌟 Especial
                </span>
              </div>

              <p className="text-sm font-bold text-green-600 mt-6 px-4 py-3 bg-green-50 rounded-2xl border-2 border-green-200">
                Centro Inclusivo para Atendimento e Desenvolvimento Infantil
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="w-full py-4 text-center text-sm font-bold absolute bottom-0 z-10">
        <p className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          © {new Date().getFullYear()} Roar Projects | Desenvolvido com 💙 por Itallo Guedes | v2.0.0
        </p>
      </footer>
    </div>
  );
}
