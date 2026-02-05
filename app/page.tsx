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
import { FaPuzzlePiece, FaHandsHelping, FaInfinity, FaEye, FaEyeSlash, FaShieldAlt, FaLock, FaExclamationTriangle, FaCheckCircle, FaSearch, FaHeart, FaUsers, FaStar } from 'react-icons/fa';

// Animações otimizadas
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
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
      stiffness: 150,
      damping: 20,
    },
  },
};

const floatingVariants: Variants = {
  animate: {
    y: [-4, 4, -4],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Rate limiting
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 60000,
  COOLDOWN_MS: 30000,
};

// Indicador de força de senha
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
    if (score <= 4) return { level: 2, label: 'Média', color: 'bg-amber-500' };
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
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(strength.level / 4) * 100}%` }}
            transition={{ duration: 0.4 }}
            className={`h-full ${strength.color} rounded-full`}
          />
        </div>
        <span className={`text-xs font-medium min-w-[70px] text-right ${strength.level <= 1 ? 'text-red-600' :
          strength.level === 2 ? 'text-amber-600' :
            'text-emerald-600'
          }`}>
          {strength.label}
        </span>
      </div>
    </motion.div>
  );
}

// Input elegante
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
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <motion.div
          className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 opacity-0"
          animate={{ opacity: isFocused ? 0.4 : 0 }}
          transition={{ duration: 0.2 }}
        />
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
          className="relative w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-teal-400 focus:ring-0 transition-colors duration-200 bg-white text-slate-700 placeholder-slate-400"
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors"
            aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {isPasswordVisible ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
          </button>
        )}
      </div>
    </motion.div>
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

  const cleanOldAttempts = useCallback(() => {
    const now = Date.now();
    setLoginAttempts(prev => prev.filter(time => now - time < RATE_LIMIT.WINDOW_MS));
  }, []);

  const checkRateLimit = useCallback((): boolean => {
    cleanOldAttempts();
    if (loginAttempts.length >= RATE_LIMIT.MAX_ATTEMPTS) {
      setIsRateLimited(true);
      setCooldownRemaining(RATE_LIMIT.COOLDOWN_MS);
      return false;
    }
    return true;
  }, [loginAttempts, cleanOldAttempts]);

  const sanitizeInput = (input: string): string => {
    return input.trim().slice(0, 255);
  };

  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      setError('Erro de conexão com o servidor. Por favor, tente novamente mais tarde.');
      return;
    }

    if (!isRegistering && !isRecovering && !checkRateLimit()) {
      setError(`Muitas tentativas. Aguarde ${Math.ceil(RATE_LIMIT.COOLDOWN_MS / 1000)} segundos.`);
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedPassword = sanitizeInput(password);

    try {
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
          setMessage('Verifique seu email para confirmar o cadastro.');
        }
      } else {
        setLoginAttempts(prev => [...prev, Date.now()]);

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: sanitizedPassword
        });

        if (signInError) throw signInError;

        if (data.session) {
          await supabase.auth.refreshSession();

          // Ler role diretamente do user_metadata
          const userRole = data.session.user.user_metadata?.role;

          if (userRole === 'admin' || userRole === 'atendente' || userRole === 'superadmin') {
            router.push(AUTH_CONFIG.REDIRECT_URLS.DASHBOARD);
          } else if (userRole === 'recepcao') {
            router.push('/admin/agendamentos/hoje');
          } else {
            router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
          }
        }
      }
    } catch (err: unknown) {
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

  const isSubmitDisabled = loading || !email || (!isRecovering && !password) || (isRegistering && !confirmPassword) || isRateLimited;

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
    <div className="min-h-screen w-full flex items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-6xl relative z-10"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white overflow-hidden">
          <div className="flex flex-col lg:flex-row">

            {/* Left Column: Login Form */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="w-full lg:w-1/2 p-8 md:p-12 lg:p-14"
            >
              <div className="w-full max-w-sm mx-auto">
                {/* Logo */}
                <motion.div variants={itemVariants} className="flex flex-col items-center mb-10">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative w-24 h-24 mb-6 bg-white rounded-2xl shadow-lg shadow-teal-100/50 flex items-center justify-center"
                  >
                    <Image
                      src="/logoautismo.png"
                      alt="Logo CIADI"
                      width={72}
                      height={72}
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
                      className="text-center"
                    >
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {isRecovering ? 'Recuperar Acesso' : isRegistering ? 'Criar Conta' : 'Bem-vindo'}
                      </h2>
                      <p className="text-slate-500">
                        {isRecovering
                          ? 'Informe seu email para recuperar a senha.'
                          : isRegistering
                            ? 'Preencha os dados para criar sua conta.'
                            : 'Entre com suas credenciais para continuar.'}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-1">
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
                      >
                        <InputField
                          id="password"
                          type="password"
                          label="Senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete={isRegistering ? 'new-password' : 'current-password'}
                          placeholder="Digite sua senha"
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
                      >
                        <InputField
                          id="confirmPassword"
                          type="password"
                          label="Confirmar Senha"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Confirme sua senha"
                          showPasswordToggle
                          isPasswordVisible={showConfirmPassword}
                          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Messages */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm"
                      >
                        <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-start gap-3 bg-teal-50 border border-teal-100 text-teal-700 px-4 py-3 rounded-xl text-sm"
                      >
                        <FaCheckCircle className="mt-0.5 flex-shrink-0" />
                        <span>{message}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isRateLimited && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 bg-amber-50 border border-amber-100 text-amber-700 px-4 py-3 rounded-xl text-sm"
                      >
                        <FaShieldAlt className="flex-shrink-0" />
                        <span>Aguarde {Math.ceil(cooldownRemaining / 1000)}s para tentar novamente</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <motion.div variants={itemVariants} className="pt-4">
                    <motion.button
                      type="submit"
                      disabled={isSubmitDisabled}
                      whileHover={!isSubmitDisabled ? { scale: 1.01 } : {}}
                      whileTap={!isSubmitDisabled ? { scale: 0.99 } : {}}
                      className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 ${isSubmitDisabled
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30'
                        }`}
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <FaLock size={14} />
                          <span>
                            {isRecovering
                              ? 'Enviar Instruções'
                              : isRegistering
                                ? 'Criar Conta'
                                : 'Entrar'}
                          </span>
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </form>

                {/* Google Login */}
                <AnimatePresence>
                  {!isRecovering && !isRegistering && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex items-center my-6">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="px-4 text-sm text-slate-400">ou</span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      <motion.button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full py-3.5 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 text-slate-700 font-medium flex items-center justify-center gap-3"
                      >
                        <FcGoogle size={20} />
                        <span>Continuar com Google</span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Links */}
                <motion.div variants={itemVariants} className="mt-6 text-center text-sm">
                  {!isRecovering && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setError(null); setMessage(null); }}
                        className="font-medium text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        {isRegistering ? 'Já tenho uma conta' : 'Criar nova conta'}
                      </button>
                      <span className="hidden sm:inline text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => { setIsRecovering(true); setError(null); setMessage(null); }}
                        className="text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}
                  {isRecovering && (
                    <button
                      type="button"
                      onClick={() => { setIsRecovering(false); setError(null); setMessage(null); }}
                      className="font-medium text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      Voltar para o login
                    </button>
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Right Column: Feature Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full lg:w-1/2 p-8 md:p-12 lg:p-14 bg-gradient-to-br from-teal-500 to-emerald-600 flex flex-col justify-center relative overflow-hidden"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 right-10 w-32 h-32 border-2 border-white rounded-full" />
                <div className="absolute bottom-20 left-10 w-24 h-24 border-2 border-white rounded-full" />
                <div className="absolute top-1/2 right-1/4 w-16 h-16 border-2 border-white rounded-full" />
              </div>

              <div className="relative z-10 max-w-md mx-auto text-white">
                {/* Icons */}
                <motion.div
                  className="mb-8 flex justify-center gap-4"
                >
                  {[
                    { Icon: FaPuzzlePiece, delay: 0 },
                    { Icon: FaHandsHelping, delay: 0.1 },
                    { Icon: FaInfinity, delay: 0.2 },
                  ].map(({ Icon, delay }, index) => (
                    <motion.div
                      key={index}
                      variants={floatingVariants}
                      animate="animate"
                      transition={{ delay }}
                      className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl"
                    >
                      <Icon size={28} />
                    </motion.div>
                  ))}
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-4xl font-bold mb-4 text-center"
                >
                  Sala Sensorial ALECE
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-white/90 text-lg mb-8 text-center leading-relaxed"
                >
                  Um ambiente projetado para o desenvolvimento e acolhimento de crianças com autismo, síndrome de Down e TDAH.
                </motion.p>

                {/* Features */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-3 mb-10"
                >
                  {[
                    { icon: FaHeart, text: 'Inclusão' },
                    { icon: FaUsers, text: 'Acolhimento' },
                    { icon: FaStar, text: 'Desenvolvimento' },
                  ].map(({ icon: Icon, text }, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium"
                    >
                      <Icon size={14} />
                      {text}
                    </span>
                  ))}
                </motion.div>

                <div className="w-full h-px bg-white/20 my-8" />

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-center"
                >
                  <p className="text-white/80 mb-4">Já realizou um atendimento?</p>
                  <Link
                    href="/consulta"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-white/95 transition-colors shadow-lg"
                  >
                    <FaSearch size={16} />
                    Consultar Status
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="fixed bottom-4 w-full text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Roar Projects | Desenvolvido por Itallo Guedes</p>
      </footer>
    </div>
  );
}
