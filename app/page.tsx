'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AUTH_CONFIG } from '../lib/auth-config';
import { validatePassword, validateEmail, handleAuthError } from '../lib/auth-utils';
import { supabase, checkSupabaseConnection, handleSupabaseError } from '../lib/supabase-client';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';

// Campo de input reutilizável com design lúdico
function InputField({
  id, label, type, value, onChange, required = true, autoComplete, placeholder,
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  const getIcon = () => {
    if (id === 'email') return '✉️';
    if (id === 'password' || id === 'confirmPassword') return '🔒';
    return '📝';
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-gray-700 mb-2">
        {getIcon()} {label}
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
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#23B4E7] focus:ring-4 focus:ring-[#23B4E7]/20 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:border-[#3AC28D] hover:shadow-md"
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

  // Função para login com Google
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      setError('Erro ao fazer login com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Bolhas coloridas decorativas - cores do autismo */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#23B4E7] opacity-30 rounded-full blur-3xl z-0 animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#3AC28D] opacity-30 rounded-full blur-3xl z-0 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-0 w-40 h-40 bg-[#FFA726] opacity-30 rounded-full blur-2xl z-0 animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-0 right-1/2 w-32 h-32 bg-[#FFD600] opacity-30 rounded-full blur-2xl z-0 animate-pulse" style={{ animationDelay: '3s' }} />

      {/* Peças de quebra-cabeça flutuantes - símbolo do autismo */}
      <div className="absolute top-20 right-20 w-16 h-16 opacity-20 animate-bounce" style={{ animationDelay: '0.5s' }}>
        <svg viewBox="0 0 100 100" className="fill-[#23B4E7]">
          <path d="M50,0 C60,0 70,10 70,20 C70,30 60,40 50,40 C40,40 30,30 30,20 C30,10 40,0 50,0 Z M50,60 C60,60 70,70 70,80 C70,90 60,100 50,100 C40,100 30,90 30,80 C30,70 40,60 50,60 Z M0,50 C0,40 10,30 20,30 C30,30 40,40 40,50 C40,60 30,70 20,70 C10,70 0,60 0,50 Z M60,50 C60,40 70,30 80,30 C90,30 100,40 100,50 C100,60 90,70 80,70 C70,70 60,60 60,50 Z"/>
        </svg>
      </div>
      <div className="absolute bottom-32 left-32 w-12 h-12 opacity-20 animate-bounce" style={{ animationDelay: '1.5s' }}>
        <svg viewBox="0 0 100 100" className="fill-[#FFA726]">
          <path d="M50,0 C60,0 70,10 70,20 C70,30 60,40 50,40 C40,40 30,30 30,20 C30,10 40,0 50,0 Z M50,60 C60,60 70,70 70,80 C70,90 60,100 50,100 C40,100 30,90 30,80 C30,70 40,60 50,60 Z M0,50 C0,40 10,30 20,30 C30,30 40,40 40,50 C40,60 30,70 20,70 C10,70 0,60 0,50 Z M60,50 C60,40 70,30 80,30 C90,30 100,40 100,50 C100,60 90,70 80,70 C70,70 60,60 60,50 Z"/>
        </svg>
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center relative z-10">
        {/* Card do formulário */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-12 z-10">
          <div className="w-full max-w-md bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border-4 border-[#23B4E7] flex flex-col gap-6 transform transition-all duration-300 hover:shadow-3xl">
            <div className="flex flex-col items-center mb-2">
              <div className="relative">
                <Image
                  src="/logoautismo.png"
                  alt="Logo CIADI"
                  width={130}
                  height={130}
                  className="object-contain mb-2 transform transition-transform duration-300 hover:scale-110"
                  priority
                />
                {/* Estrelinhas decorativas */}
                <div className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="absolute -bottom-2 -left-2 w-5 h-5 text-pink-400 animate-pulse">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-[#23B4E7] via-[#3AC28D] to-[#FFA726] bg-clip-text text-transparent">
              {isRecovering ? '🔐 Recuperar Senha' : isRegistering ? '✨ Criar nova conta' : '🌈 Bem-vindo de volta!'}
            </h2>
            <p className="text-center text-gray-600 text-sm">
              {isRecovering
                ? 'Digite seu email para receber as instruções de recuperação 📧'
                : isRegistering
                ? 'Preencha seus dados para começar sua jornada 🚀'
                : 'Entre com suas credenciais para acessar o sistema 🎯'}
            </p>
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
                className={`w-full py-3 rounded-xl text-white font-medium transition-all duration-200 transform hover:scale-[1.02] ${
                  isSubmitDisabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#23B4E7] to-[#1A8AB0] hover:from-[#1A8AB0] hover:to-[#23B4E7] shadow-lg hover:shadow-xl active:scale-[0.98]'
                }`}
              >
                {loading
                  ? '⏳ Processando...'
                  : isRecovering
                  ? '📧 Enviar email de recuperação'
                  : isRegistering
                  ? '✨ Criar conta'
                  : '🚀 Entrar'}
              </button>
            </form>

            {/* Separador "OU" */}
            {!isRecovering && (
              <div className="relative flex items-center justify-center my-2">
                <div className="absolute w-full border-t-2 border-gray-200"></div>
                <div className="relative bg-white px-4 text-sm text-gray-500 font-medium">
                  ou continue com
                </div>
              </div>
            )}

            {/* Botão do Google */}
            {!isRecovering && (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3 transform hover:scale-[1.02] ${
                  loading
                    ? 'bg-gray-100 cursor-not-allowed'
                    : 'bg-white border-2 border-gray-300 hover:border-[#23B4E7] hover:shadow-lg active:scale-[0.98]'
                }`}
              >
                <FcGoogle className="text-2xl" />
                <span className="text-gray-700">
                  {isRegistering ? 'Cadastrar com Google' : 'Entrar com Google'}
                </span>
              </button>
            )}

            <div className="mt-6 flex flex-col items-center space-y-4">
              <div className="w-full border-t-2 border-gray-200"></div>

              <Link
                href="/consulta"
                className="flex items-center justify-center px-6 py-3 rounded-xl text-white font-bold border-2 border-[#FFA726] bg-gradient-to-r from-[#FFA726] to-[#FF8A00] hover:from-[#FF8A00] hover:to-[#FFA726] shadow-lg hover:shadow-xl transition-all duration-200 w-full transform hover:scale-[1.02] active:scale-[0.98]"
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
                🔍 Consultar Status do Documento
              </Link>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-600">
                {!isRecovering && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-[#23B4E7] hover:text-[#1A8AB0] font-medium"
                    >
                      {isRegistering ? 'Já tem uma conta? Entre' : 'Não tem uma conta? Cadastre-se'}
                    </button>
                    <span className="hidden sm:inline">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecovering(true);
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-[#23B4E7] hover:text-[#1A8AB0] font-medium"
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
                    className="text-[#23B4E7] hover:text-[#1A8AB0] font-medium"
                  >
                    Voltar ao login
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block h-[70%] w-1 border-l-2 border-[#23B4E7] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 rounded-full shadow-lg" />

        {/* Card do destaque */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-12 z-10">
          <div className="w-full max-w-xl text-center bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border-4 border-[#3AC28D] flex flex-col items-center gap-6 transform transition-all duration-300 hover:shadow-3xl">
            {/* Coração decorativo */}
            <div className="relative">
              <Image
                src="/logoautismo.png"
                alt="Logo CIADI"
                width={120}
                height={120}
                className="object-contain mb-4 transform transition-transform duration-300 hover:scale-110"
                priority
              />
              {/* Confetes decorativos */}
              <div className="absolute -top-4 -left-4 text-4xl animate-bounce">🎨</div>
              <div className="absolute -top-4 -right-4 text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>🌟</div>
              <div className="absolute -bottom-4 -left-4 text-4xl animate-bounce" style={{ animationDelay: '0.4s' }}>💙</div>
              <div className="absolute -bottom-4 -right-4 text-4xl animate-bounce" style={{ animationDelay: '0.6s' }}>🧩</div>
            </div>

            {/* Aspas decorativas */}
            <div className="relative w-full">
              <svg className="absolute -top-6 -left-2 opacity-30" width="40" height="40" viewBox="0 0 48 48" fill="none">
                <text x="0" y="35" fontSize="40" fill="#FFA726">"</text>
              </svg>
              <svg className="absolute -bottom-6 -right-2 opacity-30 transform rotate-180" width="40" height="40" viewBox="0 0 48 48" fill="none">
                <text x="0" y="35" fontSize="40" fill="#FFA726">"</text>
              </svg>

              <p className="text-xl font-medium mb-6 px-8 leading-relaxed bg-gradient-to-r from-[#23B4E7] via-[#3AC28D] to-[#FFA726] bg-clip-text text-transparent">
                Bem-vindo à plataforma dedicada ao gerenciamento da Sala Sensorial / ALECE.
                Nossa missão é proporcionar um ambiente acolhedor e organizado para o desenvolvimento e acompanhamento das atividades.
              </p>
            </div>

            {/* Badges informativos */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-2 bg-gradient-to-r from-[#23B4E7] to-[#1A8AB0] text-white rounded-full text-sm font-bold shadow-lg transform transition-transform hover:scale-105">
                🏥 Centro Inclusivo
              </span>
              <span className="px-4 py-2 bg-gradient-to-r from-[#3AC28D] to-[#2BA876] text-white rounded-full text-sm font-bold shadow-lg transform transition-transform hover:scale-105">
                👶 Atendimento Infantil
              </span>
              <span className="px-4 py-2 bg-gradient-to-r from-[#FFA726] to-[#FF8A00] text-white rounded-full text-sm font-bold shadow-lg transform transition-transform hover:scale-105">
                🌈 Desenvolvimento
              </span>
            </div>

            {/* Frase motivacional */}
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl border-2 border-purple-300">
              <p className="text-purple-700 font-semibold text-sm">
                ✨ "Cada criança é única e especial, e juntos construímos um futuro mais inclusivo!" ✨
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="w-full py-4 text-center text-sm text-gray-600 absolute bottom-0 z-10">
        <p>© {new Date().getFullYear()} Roar Projects | Desenvolvido por Itallo Guedes | v1.0.3</p>
      </footer>
    </div>
  );
}
