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

// ==================== ANIMAÇÕES FUTURÍSTICAS ====================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
    },
  },
};

const glowPulse: Variants = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(20, 184, 166, 0.3)',
      '0 0 40px rgba(20, 184, 166, 0.6)',
      '0 0 20px rgba(20, 184, 166, 0.3)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const floatingVariants: Variants = {
  animate: {
    y: [-8, 8, -8],
    rotate: [-2, 2, -2],
    transition: {
      duration: 4,
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
  WINDOW_MS: 60000,
  COOLDOWN_MS: 30000,
};

// ==================== COMPONENTES FUTURÍSTICOS ====================

// Efeito de brilho animado que percorre o elemento
function ShimmerEffect() {
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 2,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}

// Partículas brilhantes flutuantes
function SparkleParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-teal-400 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
            y: [0, -30, -60],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// Linhas de energia animadas no fundo
function EnergyLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent"
          style={{
            top: `${20 + i * 15}%`,
            width: '100%',
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scaleX: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Borda com gradiente animado
function AnimatedBorder({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 opacity-75"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl">
        {children}
      </div>
    </div>
  );
}

// Círculos de radar pulsantes
function RadarPulse() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[600px] h-[600px] rounded-full border border-teal-400/20"
          animate={{
            scale: [1, 2, 3],
            opacity: [0.5, 0.2, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 1.3,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// Orbe flutuante com glow
function FloatingOrb({ delay = 0, size = 100, color = 'teal' }: { delay?: number; size?: number; color?: string }) {
  const colorClasses = {
    teal: 'from-teal-400/40 to-teal-600/20',
    emerald: 'from-emerald-400/40 to-emerald-600/20',
    purple: 'from-purple-400/40 to-purple-600/20',
  };

  return (
    <motion.div
      className={`absolute rounded-full bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} blur-xl`}
      style={{ width: size, height: size }}
      animate={{
        y: [-20, 20, -20],
        x: [-10, 10, -10],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );
}

// Indicador de força de senha com animação
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

    if (score <= 2) return { level: 1, label: 'Fraca', color: 'bg-red-500', glow: 'shadow-red-500/50' };
    if (score <= 4) return { level: 2, label: 'Média', color: 'bg-yellow-500', glow: 'shadow-yellow-500/50' };
    if (score <= 5) return { level: 3, label: 'Forte', color: 'bg-teal-500', glow: 'shadow-teal-500/50' };
    return { level: 4, label: 'Muito Forte', color: 'bg-emerald-500', glow: 'shadow-emerald-500/50' };
  }, [password]);

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(strength.level / 4) * 100}%` }}
            transition={{ duration: 0.5, type: 'spring' }}
            className={`h-full ${strength.color} rounded-full shadow-lg ${strength.glow}`}
          />
        </div>
        <motion.span
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`text-xs font-bold ${strength.level <= 1 ? 'text-red-500' :
              strength.level === 2 ? 'text-yellow-600' :
                'text-emerald-600'
            }`}
        >
          {strength.label}
        </motion.span>
      </div>
    </motion.div>
  );
}

// Input futurístico com efeitos de glow
function FuturisticInput({
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
    <motion.div variants={itemVariants} className="mb-5">
      <label htmlFor={id} className="block text-sm font-bold text-slate-700 mb-2 pl-1 tracking-wide">
        {label}
      </label>
      <div className="relative group">
        {/* Glow effect on focus */}
        <motion.div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-400 opacity-0 blur-sm transition-opacity duration-300"
          animate={{
            opacity: isFocused ? 0.5 : 0,
          }}
        />

        <div className="relative">
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
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 focus:border-teal-400 focus:ring-0 transition-all duration-300 bg-white/80 backdrop-blur-sm text-slate-700 placeholder-slate-400 shadow-sm hover:border-teal-300 pr-12 font-medium"
          />

          {/* Shimmer effect on hover */}
          <motion.div
            className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <motion.div
              className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-teal-100/50 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            />
          </motion.div>
        </div>

        {showPasswordToggle && (
          <motion.button
            type="button"
            onClick={onTogglePassword}
            whileHover={{ scale: 1.2, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors z-10"
            aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <motion.div
              animate={isPasswordVisible ? { rotateY: 180 } : { rotateY: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isPasswordVisible ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
            </motion.div>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// Botão futurístico com efeitos
function FuturisticButton({
  children,
  disabled,
  loading,
  type = 'submit',
  onClick,
  variant = 'primary'
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`relative w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 overflow-hidden ${disabled
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
          : isPrimary
            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40'
            : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-teal-300'
        }`}
    >
      {/* Animated background glow */}
      {!disabled && isPrimary && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-400"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            backgroundSize: '200% 200%',
            opacity: 0.5,
          }}
        />
      )}

      {/* Shimmer effect */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      )}

      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
            <span>Processando...</span>
          </>
        ) : (
          children
        )}
      </span>
    </motion.button>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

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
          setMessage('Verifique seu email para confirmar o cadastro');
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

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('email', sanitizedEmail)
            .single();

          if (userError) {
            console.warn('Erro ao verificar permissões do usuário');
            router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
            return;
          }

          if (userData?.role === 'admin' || userData?.role === 'atendente' || userData?.role === 'superadmin') {
            router.push(AUTH_CONFIG.REDIRECT_URLS.DASHBOARD);
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-slate-50 via-teal-50/30 to-purple-50/30 relative overflow-hidden">
      {/* Background Effects */}
      <RadarPulse />
      <EnergyLines />

      {/* Floating Orbs */}
      <FloatingOrb delay={0} size={200} color="teal" />
      <FloatingOrb delay={2} size={150} color="emerald" />
      <FloatingOrb delay={4} size={180} color="purple" />

      <div className="absolute top-20 left-20">
        <FloatingOrb delay={1} size={100} color="teal" />
      </div>
      <div className="absolute bottom-20 right-20">
        <FloatingOrb delay={3} size={120} color="emerald" />
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        className="w-full max-w-6xl relative z-10"
      >
        <AnimatedBorder>
          <div className="flex flex-col lg:flex-row overflow-hidden">
            <SparkleParticles />

            {/* Left Column: Login Form */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative"
            >
              <ShimmerEffect />

              <div className="w-full max-w-md mx-auto relative z-10">
                {/* Logo with glow effect */}
                <motion.div variants={itemVariants} className="flex flex-col items-center mb-10">
                  <motion.div
                    variants={glowPulse}
                    animate="animate"
                    className="relative w-28 h-28 mb-6 p-4 bg-white rounded-full shadow-xl flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400/20 via-transparent to-emerald-400/20"
                    />
                    <Image
                      src="/logoautismo.png"
                      alt="Logo CIADI"
                      width={80}
                      height={80}
                      className="object-contain relative z-10"
                      priority
                    />
                  </motion.div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isRecovering ? 'recover' : isRegistering ? 'register' : 'login'}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      transition={{ duration: 0.3, type: 'spring' }}
                      className="text-center space-y-3"
                    >
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                        {isRecovering ? 'Recuperar Acesso' : isRegistering ? 'Criar Conta' : 'Bem-vindo'}
                      </h2>
                      <p className="text-slate-500 text-lg font-medium">
                        {isRecovering
                          ? 'Vamos ajudar você a recuperar sua senha.'
                          : isRegistering
                            ? 'Junte-se a nós neste espaço seguro.'
                            : 'Você está em um espaço seguro.'}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                {/* Form */}
                <motion.form
                  variants={containerVariants}
                  onSubmit={handleAuth}
                  className="w-full space-y-2"
                >
                  <FuturisticInput
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
                        <FuturisticInput
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
                        <FuturisticInput
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

                  {/* Error/Success Messages */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        variants={shakeVariants}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-red-50 border-2 border-red-200 text-red-600 px-5 py-4 rounded-2xl text-sm flex items-center font-medium shadow-lg shadow-red-100"
                      >
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5, repeat: 2 }}
                          className="mr-3 text-lg"
                        >
                          ⚠️
                        </motion.span>
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="bg-teal-50 border-2 border-teal-200 text-teal-700 px-5 py-4 rounded-2xl text-sm flex items-center font-medium shadow-lg shadow-teal-100"
                      >
                        <motion.span
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 0.5, repeat: 2 }}
                          className="mr-3 text-lg"
                        >
                          ✅
                        </motion.span>
                        {message}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isRateLimited && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-amber-50 border-2 border-amber-200 text-amber-700 px-5 py-4 rounded-2xl text-sm flex items-center font-medium"
                      >
                        <FaShieldAlt className="mr-3 text-lg" />
                        <span>Aguarde <strong>{Math.ceil(cooldownRemaining / 1000)}s</strong> para tentar novamente</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div variants={itemVariants} className="pt-4">
                    <FuturisticButton disabled={isSubmitDisabled} loading={loading}>
                      <FaLock className="text-sm" />
                      {isRecovering
                        ? 'Enviar Instruções'
                        : isRegistering
                          ? 'Criar Minha Conta'
                          : 'Entrar no Sistema'}
                    </FuturisticButton>
                  </motion.div>
                </motion.form>

                {/* Google Login */}
                <AnimatePresence>
                  {!isRecovering && !isRegistering && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex items-center my-8">
                        <motion.div
                          className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.5, duration: 0.5 }}
                        />
                        <span className="px-4 text-sm font-bold text-slate-400">OU</span>
                        <motion.div
                          className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.5, duration: 0.5 }}
                        />
                      </div>

                      <FuturisticButton
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        variant="secondary"
                      >
                        <FcGoogle className="text-2xl" />
                        <span>Continuar com Google</span>
                      </FuturisticButton>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Links */}
                <motion.div variants={itemVariants} className="mt-8 text-center space-y-4">
                  {!isRecovering && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
                      <motion.button
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setError(null); setMessage(null); }}
                        whileHover={{ scale: 1.05, color: '#0d9488' }}
                        className="font-bold text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        {isRegistering ? 'Já tenho uma conta' : 'Criar nova conta'}
                      </motion.button>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <motion.button
                        type="button"
                        onClick={() => { setIsRecovering(true); setError(null); setMessage(null); }}
                        whileHover={{ scale: 1.05 }}
                        className="font-medium text-slate-500 hover:text-slate-700 transition-colors"
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
                      className="font-bold text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      ← Voltar para o login
                    </motion.button>
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Right Column: Feature Section */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex flex-col justify-center items-center text-center relative overflow-hidden"
            >
              {/* Animated Background Circles */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.4, 0.2],
                  rotate: [0, 180, 360],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute top-0 right-0 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl -mr-20 -mt-20"
              />
              <motion.div
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.2, 0.4, 0.2],
                  rotate: [360, 180, 0],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear', delay: 5 }}
                className="absolute bottom-0 left-0 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl -ml-20 -mb-20"
              />

              <div className="relative z-10 max-w-md">
                {/* Floating Icons */}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="mb-10 flex justify-center space-x-6"
                >
                  {[
                    { Icon: FaPuzzlePiece, color: 'text-teal-500', bg: 'bg-teal-50', delay: 0 },
                    { Icon: FaHandsHelping, color: 'text-blue-500', bg: 'bg-blue-50', delay: 0.5 },
                    { Icon: FaInfinity, color: 'text-purple-500', bg: 'bg-purple-50', delay: 1 },
                  ].map(({ Icon, color, bg, delay }, index) => (
                    <motion.div
                      key={index}
                      variants={floatingVariants}
                      animate="animate"
                      transition={{ delay }}
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      className={`p-4 ${bg} rounded-2xl shadow-lg ${color} cursor-pointer`}
                    >
                      <Icon size={36} />
                    </motion.div>
                  ))}
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl md:text-5xl font-black text-slate-800 mb-6 leading-tight"
                >
                  Sala Sensorial{' '}
                  <motion.span
                    className="text-teal-600 inline-block"
                    animate={{
                      textShadow: [
                        '0 0 10px rgba(20, 184, 166, 0.3)',
                        '0 0 20px rgba(20, 184, 166, 0.5)',
                        '0 0 10px rgba(20, 184, 166, 0.3)',
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ALECE
                  </motion.span>
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-slate-600 text-xl mb-10 leading-relaxed font-medium"
                >
                  Um ambiente projetado com carinho para o desenvolvimento e acolhimento de crianças com autismo, síndrome de Down e TDAH.
                </motion.p>

                {/* Tags with hover effects */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-wrap justify-center gap-4 mb-12"
                >
                  {[
                    { emoji: '💙', text: 'Inclusão', color: 'text-teal-700', border: 'border-teal-200', bg: 'bg-teal-50' },
                    { emoji: '🤝', text: 'Acolhimento', color: 'text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50' },
                    { emoji: '✨', text: 'Desenvolvimento', color: 'text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50' },
                  ].map(({ emoji, text, color, border, bg }, index) => (
                    <motion.span
                      key={index}
                      whileHover={{ scale: 1.1, y: -5 }}
                      className={`px-5 py-2.5 ${bg} ${color} rounded-full text-sm font-bold border-2 ${border} shadow-sm cursor-default`}
                    >
                      {emoji} {text}
                    </motion.span>
                  ))}
                </motion.div>

                <motion.div
                  className="w-full h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent my-10"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                />

                {/* CTA Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl border-2 border-white shadow-xl"
                >
                  <p className="text-slate-600 mb-5 font-bold text-lg">Já realizou um atendimento?</p>
                  <Link
                    href="/consulta"
                    className="flex items-center justify-center px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all duration-300 group"
                  >
                    <motion.svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </motion.svg>
                    Consultar Status do Atendimento
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </AnimatedBorder>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-4 w-full text-center text-xs text-slate-400 pointer-events-none"
      >
        <p>© {new Date().getFullYear()} Roar Projects | Desenvolvido por Itallo Guedes</p>
      </motion.footer>
    </div>
  );
}
