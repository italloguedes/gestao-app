'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { RecoverForm } from './components/auth/RecoverForm';
import { AUTH_CONFIG } from '@/lib/auth-config';
import { supabase, checkSupabaseConnection, handleSupabaseError } from '@/lib/supabase-client';
import { FaPuzzlePiece, FaHandsHelping, FaInfinity } from 'react-icons/fa';
import Link from 'next/link';

export default function Home() {
  const [view, setView] = useState<'login' | 'register' | 'recover'>('login');
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkSupabaseConnection().then((connected) => {
      if (!connected) {
        setGlobalError('Erro de conexão com o servidor. Tente novamente mais tarde.');
      }
    });
  }, []);

  const clearMessages = () => {
    setGlobalError(null);
    setSuccessMessage(null);
  };

  const handleLogin = async ({ email, password }: any) => {
    clearMessages();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.session) {
        await supabase.auth.refreshSession();
        localStorage.setItem('session-expiry', String(Date.now() + 7200000));

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single();

        if (userError) {
          console.error('Erro ao buscar usuário:', userError);
          router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
          return;
        }

        const role = userData?.role;
        if (role === 'admin' || role === 'atendente' || role === 'superadmin') {
          router.push(AUTH_CONFIG.REDIRECT_URLS.DASHBOARD);
        } else {
          router.push(AUTH_CONFIG.REDIRECT_URLS.AGENDAMENTO);
        }
      }
    } catch (err) {
      setGlobalError(handleSupabaseError(err));
      setLoading(false);
    }
  };

  const handleRegister = async ({ email, password }: any) => {
    clearMessages();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${AUTH_CONFIG.REDIRECT_URLS.EMAIL_CONFIRMATION}`,
          data: { email, status: 'active' }
        }
      });

      if (error) throw error;

      if (data.user) {
        setSuccessMessage('Conta criada! Verifique seu email para confirmar.');
        setView('login');
      }
    } catch (err) {
      setGlobalError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (email: string) => {
    clearMessages();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback/reset-password`,
      });
      if (error) throw error;
      setSuccessMessage('Instruções enviadas para seu email.');
      setView('login');
    } catch (err) {
      setGlobalError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });
      if (error) throw error;
    } catch (err) {
      setGlobalError('Erro ao iniciar login com Google.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-teal-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl flex flex-col lg:flex-row bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 z-10"
      >
        {/* Left Column: Form Area */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center p-4 border border-white/5 backdrop-blur-md">
              <Image src="/logoautismo.png" alt="Logo" width={60} height={60} className="object-contain" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {view === 'login' && (
              <LoginForm
                key="login"
                onLogin={handleLogin}
                onGoogleLogin={handleGoogleLogin}
                onForgotPassword={() => setView('recover')}
                onRegister={() => setView('register')}
                loading={loading}
              />
            )}
            {view === 'register' && (
              <RegisterForm
                key="register"
                onRegister={handleRegister}
                onBack={() => setView('login')}
                loading={loading}
              />
            )}
            {view === 'recover' && (
              <RecoverForm
                key="recover"
                onRecover={handleRecover}
                onBack={() => setView('login')}
                loading={loading}
              />
            )}
          </AnimatePresence>

          {/* Feedback Messages */}
          <AnimatePresence>
            {globalError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-6 left-0 right-0 mx-8 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center justify-center backdrop-blur-sm"
              >
                <span className="mr-2">⚠️</span> {globalError}
                <button onClick={() => setGlobalError(null)} className="ml-4 text-red-400 hover:text-white">✕</button>
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-6 left-0 right-0 mx-8 bg-teal-500/10 border border-teal-500/20 text-teal-200 px-4 py-3 rounded-xl text-sm flex items-center justify-center backdrop-blur-sm"
              >
                <span className="mr-2">✅</span> {successMessage}
                <button onClick={() => setSuccessMessage(null)} className="ml-4 text-teal-400 hover:text-white">✕</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Hero Area */}
        <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-slate-800 to-slate-900 p-16 flex-col justify-center items-center text-center overflow-hidden">
          {/* Animated Mesh Gradient Overlay */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

          <div className="relative z-10 w-full max-w-md">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-10 inline-block p-6 bg-white/5 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm"
            >
              <Image
                src="/logoautismo.png"
                alt="Logo CIADI"
                width={140}
                height={140}
                className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                priority
              />
            </motion.div>

            <motion.h3
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight"
            >
              Sala Sensorial <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">ALECE</span>
            </motion.h3>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              <p className="text-slate-400 text-lg leading-relaxed font-light">
                Tecnologia e cuidado unidos para o desenvolvimento de crianças com autismo, síndrome de Down e TDAH.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-teal-300 text-sm font-medium">
                  <FaPuzzlePiece /> Inclusão
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-blue-300 text-sm font-medium">
                  <FaHandsHelping /> Acolhimento
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-purple-300 text-sm font-medium">
                  <FaInfinity /> Evolução
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 pt-8 border-t border-white/10"
            >
              <Link
                href="/consulta"
                className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all duration-300 hover:scale-105"
              >
                Já foi atendido? Consultar Status
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-4 text-slate-600 text-xs text-center w-full z-10 pointer-events-none">
        © {new Date().getFullYear()} Roar Projects | Desenvolvido por Itallo Guedes
      </div>
    </div>
  );
}
