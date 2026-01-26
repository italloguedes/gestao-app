'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { AUTH_CONFIG } from '../lib/auth-config';
import { validatePassword, validateEmail } from '../lib/auth-utils';
import { supabase, checkSupabaseConnection, handleSupabaseError } from '../lib/supabase-client';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';
import { FaPuzzlePiece, FaHandsHelping, FaInfinity, FaEye, FaEyeSlash, FaShieldAlt, FaLock } from 'react-icons/fa';

// Animações
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
};

const floatingVariants: Variants = {
  animate: {
    y: [-5, 5, -5],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const shakeVariants: Variants = {
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.5 },
  },
};

// Rate limiting
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 60000, // 1 minuto
  COOLDOWN_MS: 30000, // 30 segundos de cooldown após exceder
};

// Componente de força de senha
function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = useMemo(() => {
    if (!password) return { level: 0, label: '', color: 'bg-slate-200' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { level: 1, label: 'Fraca', color: 'bg-red-500' };
    if (score <= 4) return { level: 2, label: 'Média', color: 'bg-yellow-500' };
    if (score <= 5) return { level: 3, label: 'Forte', color: 'bg-teal-500' };
    return { level: 4, label: 'Muito Forte', color: 'bg-emerald-500' };
  }, [password]);

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2"
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(strength.level / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
            className={`h-full ${strength.color} rounded-full`}
          />
        </div>
        <span className={`text-xs font-medium ${strength.level <= 1 ? 'text-red-500' :
          strength.level === 2 ? 'text-yellow-600' :
            'text-emerald-600'
          }`}>
          {strength.label}
        </span>
      </div>
    </motion.div>
  );
}

// Campo de input reutilizável com design acessível e animações
function InputField({
  id, label, type, value, onChange, required = true, autoComplete, placeholder,
  showPasswordToggle = false, onTogglePassword, isPasswordVisible = false,
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  isPasswordVisible?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div variants={itemVariants} className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-600 mb-2 pl-1">
        {label}
      </label>
      <div className="relative">
        <motion.div
          animate={{
            boxShadow: isFocused
              ? '0 0 0 4px rgba(20, 184, 166, 0.15)'
              : '0 0 0 0px rgba(20, 184, 166, 0)',
          }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl"
        >
          <input
            id={id}
            type={showPasswordToggle ? (isPasswordVisible ? 'text' : 'password') : type}
            value={value}
            onChange={onChange}
            required={required}
            autoComplete={autoComplete}
            placeholder={placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-teal-400 focus:ring-0 transition-all duration-300 bg-slate-50 text-slate-700 placeholder-slate-400 shadow-sm hover:border-teal-200 pr-12"
          />
        </motion.div>
        {showPasswordToggle && (
          <motion.button
            type="button"
            onClick={onTogglePassword}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors"
            aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {isPasswordVisible ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// Partículas decorativas
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-teal-400/20 to-purple-400/20"
          initial={{
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
          }}
          animate={{
            x: [
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
            ],
            y: [
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
            ],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState<number[]>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
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

  // Rate limiting cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1000) {
            setIsRateLimited(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  // Limpa tentativas antigas de login
  const cleanOldAttempts = useCallback(() => {
    const now = Date.now();
    setLoginAttempts(prev => prev.filter(time => now - time < RATE_LIMIT.WINDOW_MS));
  }, []);

  // Verifica rate limiting
  const checkRateLimit = useCallback((): boolean => {
    cleanOldAttempts();
    if (loginAttempts.length >= RATE_LIMIT.MAX_ATTEMPTS) {
      setIsRateLimited(true);
      setCooldownRemaining(RATE_LIMIT.COOLDOWN_MS);
      return false;
    }
    return true;
  }, [loginAttempts, cleanOldAttempts]);

  // Sanitiza input
  const sanitizeInput = (input: string): string => {
    return input.trim().slice(0, 255);
  };

  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      setError('Erro de conexão com o servidor. Por favor, tente novamente mais tarde.');
      return;
    }

    // Verifica rate limiting para login
    if (!isRegistering && !isRecovering && !checkRateLimit()) {
      setError(`Muitas tentativas. Aguarde ${Math.ceil(RATE_LIMIT.COOLDOWN_MS / 1000)} segundos.`);
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    // Sanitiza inputs
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedPassword = sanitizeInput(password);

    try {
      // Validação de email
      if (!validateEmail(sanitizedEmail)) {
        setError(AUTH_CONFIG.ERROR_MESSAGES.INVALID_EMAIL);
        setLoading(false);
        return;
      }

      if (isRecovering) {
        const { error: recoverError } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
          redirectTo: `${window.location.origin}/auth/callback/reset-password`,
        });

        if (recoverError) throw recoverError;
        setMessage('Email de recuperação enviado. Verifique sua caixa de entrada.');
        setIsRecovering(false);
        return;
      }

      if (isRegistering) {
        // Validação de senha
        const passwordValidation = validatePassword(sanitizedPassword);
        if (!passwordValidation.isValid) {
          setError(passwordValidation.message || AUTH_CONFIG.ERROR_MESSAGES.WEAK_PASSWORD);
          setLoading(false);
          return;
        }

        if (sanitizedPassword !== sanitizeInput(confirmPassword)) {
          setError(AUTH_CONFIG.ERROR_MESSAGES.PASSWORDS_DONT_MATCH);
          setLoading(false);
          return;
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: sanitizedPassword,
          options: {
            emailRedirectTo: `${window.location.origin}${AUTH_CONFIG.REDIRECT_URLS.EMAIL_CONFIRMATION}`,
            data: {
              email: sanitizedEmail,
              status: 'active'
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData?.user) {
          setMessage('Verifique seu email para confirmar o cadastro');
        }
      } else {
        // Registra tentativa de login
        setLoginAttempts(prev => [...prev, Date.now()]);

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: sanitizedPassword
        });

        if (signInError) throw signInError;

        if (data.session) {
          // Força um refresh na sessão para atualizar o tempo de expiração
          await supabase.auth.refreshSession();

          // Verifica a role do usuário para redirecionar corretamente
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('email', sanitizedEmail)
            .single();

          if (userError) {
            // Log genérico sem expor dados sensíveis
            console.warn('Erro ao verificar permissões do usuário');
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
    } catch (err: unknown) {
      // Log genérico sem expor dados sensíveis
      console.warn('Falha na autenticação');
      if (err instanceof Error) {
        setError(handleSupabaseError(err));
      } else {
        setError(AUTH_CONFIG.ERROR_MESSAGES.GENERIC_ERROR);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, isRegistering, isRecovering, router, isConnected, checkRateLimit]);

  // Desabilita o botão se campos obrigatórios não estão preenchidos ou rate limited
  const isSubmitDisabled = loading || !email || (!isRecovering && !password) || (isRegistering && !confirmPassword) || isRateLimited;

  // Login com Google
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
          }
        }
      });

      if (error) throw error;
    } catch (err: unknown) {
      console.warn('Erro no login social');
      setError('Erro ao fazer login com Google. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-slate-50 via-teal-50/30 to-purple-50/30">
      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-6xl flex flex-col lg:flex-row bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50"
      >

        {/* Left Column: Login Form */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white/40"
        >
          <div className="w-full max-w-md mx-auto">
            <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
              <motion.div
                variants={pulseVariants}
                animate="animate"
                className="relative w-24 h-24 mb-6 p-4 bg-white rounded-full shadow-lg flex items-center justify-center"
              >
                <Image
                  src="/logoautismo.png"
                  alt="Logo CIADI"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={isRecovering ? 'recover' : isRegistering ? 'register' : 'login'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-center space-y-2"
                >
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
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <motion.form
              variants={containerVariants}
              onSubmit={handleAuth}
              className="w-full space-y-5"
            >
              <InputField
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="seu.email@exemplo.com"
              />

              <AnimatePresence>
                {!isRecovering && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <InputField
                      id="password"
                      type="password"
                      label="Senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isRegistering ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      showPasswordToggle
                      isPasswordVisible={showPassword}
                      onTogglePassword={() => setShowPassword(!showPassword)}
                    />
                    {isRegistering && <PasswordStrengthIndicator password={password} />}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isRegistering && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <InputField
                      id="confirmPassword"
                      type="password"
                      label="Confirmar Senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      showPasswordToggle
                      isPasswordVisible={showConfirmPassword}
                      onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    variants={shakeVariants}
                    initial="hidden"
                    animate="shake"
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center"
                  >
                    <span className="mr-2">⚠️</span> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-teal-50 border border-teal-100 text-teal-700 px-4 py-3 rounded-xl text-sm flex items-center"
                  >
                    <span className="mr-2">✅</span> {message}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isRateLimited && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-amber-50 border border-amber-100 text-amber-700 px-4 py-3 rounded-xl text-sm flex items-center"
                  >
                    <FaShieldAlt className="mr-2" />
                    Aguarde {Math.ceil(cooldownRemaining / 1000)}s para tentar novamente
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={isSubmitDisabled}
                  whileHover={!isSubmitDisabled ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isSubmitDisabled ? { scale: 0.98 } : {}}
                  className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-teal-200 flex items-center justify-center gap-2 ${isSubmitDisabled
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600'
                    }`}
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Processando...
                    </>
                  ) : (
                    <>
                      <FaLock className="text-sm" />
                      {isRecovering
                        ? 'Enviar Instruções'
                        : isRegistering
                          ? 'Criar Minha Conta'
                          : 'Entrar no Sistema'}
                    </>
                  )}
                </motion.button>
              </motion.div>
            </motion.form>

            <AnimatePresence>
              {!isRecovering && !isRegistering && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center my-8">
                    <div className="flex-1 border-t border-slate-200"></div>
                    <span className="px-4 text-sm font-medium text-slate-400">OU</span>
                    <div className="flex-1 border-t border-slate-200"></div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 rounded-xl bg-white border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all duration-300 text-slate-600 font-semibold flex items-center justify-center space-x-3 group"
                  >
                    <FcGoogle className="text-2xl group-hover:scale-110 transition-transform" />
                    <span>Continuar com Google</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={itemVariants} className="mt-8 text-center space-y-4">
              {!isRecovering && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
                  <motion.button
                    type="button"
                    onClick={() => { setIsRegistering(!isRegistering); setError(null); setMessage(null); }}
                    whileHover={{ scale: 1.05 }}
                    className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                  >
                    {isRegistering ? 'Já tenho uma conta' : 'Criar nova conta'}
                  </motion.button>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <motion.button
                    type="button"
                    onClick={() => { setIsRecovering(true); setError(null); setMessage(null); }}
                    whileHover={{ scale: 1.05 }}
                    className="font-medium text-slate-500 hover:text-slate-700 hover:underline transition-colors"
                  >
                    Esqueci minha senha
                  </motion.button>
                </div>
              )}
              {isRecovering && (
                <motion.button
                  type="button"
                  onClick={() => { setIsRecovering(false); setError(null); setMessage(null); }}
                  whileHover={{ scale: 1.05 }}
                  className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                >
                  Voltar para o login
                </motion.button>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Right Column: Feature/Welcome */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex flex-col justify-center items-center text-center relative overflow-hidden"
        >
          {/* Decorative Background Elements */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-0 right-0 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl -mr-16 -mt-16"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
            className="absolute bottom-0 left-0 w-64 h-64 bg-teal-200/30 rounded-full blur-3xl -ml-16 -mb-16"
          />

          <div className="relative z-10 max-w-md">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-8 flex justify-center space-x-4"
            >
              {[
                { Icon: FaPuzzlePiece, color: 'text-teal-500', delay: 0 },
                { Icon: FaHandsHelping, color: 'text-blue-500', delay: 0.5 },
                { Icon: FaInfinity, color: 'text-purple-500', delay: 1 },
              ].map(({ Icon, color, delay }, index) => (
                <motion.div
                  key={index}
                  variants={floatingVariants}
                  animate="animate"
                  transition={{ delay }}
                  className={`p-3 bg-white rounded-2xl shadow-sm ${color}`}
                >
                  <Icon size={32} />
                </motion.div>
              ))}
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 leading-tight"
            >
              Sala Sensorial <span className="text-teal-600">ALECE</span>
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-slate-600 text-lg mb-8 leading-relaxed"
            >
              Um ambiente projetado com carinho para o desenvolvimento e acolhimento de crianças com autismo, síndrome de Down e TDAH.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center gap-3 mb-10"
            >
              {[
                { emoji: '💙', text: 'Inclusão', color: 'text-teal-700', border: 'border-teal-100' },
                { emoji: '🤝', text: 'Acolhimento', color: 'text-blue-700', border: 'border-blue-100' },
                { emoji: '✨', text: 'Desenvolvimento', color: 'text-purple-700', border: 'border-purple-100' },
              ].map(({ emoji, text, color, border }, index) => (
                <motion.span
                  key={index}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={`px-4 py-2 bg-white/60 backdrop-blur-sm ${color} rounded-full text-sm font-bold border ${border} shadow-sm cursor-default`}
                >
                  {emoji} {text}
                </motion.span>
              ))}
            </motion.div>

            <div className="w-full border-t border-dashed border-slate-300 my-8"></div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/60 shadow-sm"
            >
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
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      <footer className="fixed bottom-4 w-full text-center text-xs text-slate-400 pointer-events-none">
        <p>© {new Date().getFullYear()} Roar Projects | Desenvolvido por Itallo Guedes</p>
      </footer>
    </div>
  );
}
