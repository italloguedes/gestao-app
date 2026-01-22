import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { AuthInput } from './AuthInput';
import { validateEmail } from '@/lib/auth-utils';
import { AUTH_CONFIG } from '@/lib/auth-config';

interface LoginFormProps {
    onLogin: (data: any) => Promise<void>;
    onGoogleLogin: () => Promise<void>;
    onForgotPassword: () => void;
    onRegister: () => void;
    loading: boolean;
}

export function LoginForm({ onLogin, onGoogleLogin, onForgotPassword, onRegister, loading }: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateEmail(email)) {
            setError(AUTH_CONFIG.ERROR_MESSAGES.INVALID_EMAIL);
            return;
        }
        setError(null);
        await onLogin({ email, password });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm mx-auto"
        >
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                    Bem-vindo de volta
                </h2>
                <p className="text-slate-400">Acesse sua conta para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <AuthInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<FiMail className="w-5 h-5" />}
                    placeholder="seu@email.com"
                    error={error || undefined}
                    disabled={loading}
                />

                <div className="space-y-1">
                    <AuthInput
                        label="Senha"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={<FiLock className="w-5 h-5" />}
                        placeholder="••••••••"
                        disabled={loading}
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onForgotPassword}
                            className="text-xs text-teal-400 hover:text-teal-300 transition-colors font-medium"
                        >
                            Esqueceu a senha?
                        </button>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading || !email || !password}
                    className={`
            w-full py-3.5 rounded-xl font-bold text-white shadow-lg
            flex items-center justify-center gap-2 group
            bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300
          `}
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Entrar
                            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </motion.button>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-slate-900 text-slate-500">Ou continue com</span>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onGoogleLogin}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 text-slate-300 font-semibold flex items-center justify-center gap-3 transition-all duration-300"
                >
                    <FcGoogle className="text-xl" />
                    <span>Google</span>
                </motion.button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-400">
                Não tem uma conta?{' '}
                <button
                    onClick={onRegister}
                    className="text-teal-400 hover:text-teal-300 font-bold hover:underline transition-all"
                >
                    Cadastre-se
                </button>
            </div>
        </motion.div>
    );
}
