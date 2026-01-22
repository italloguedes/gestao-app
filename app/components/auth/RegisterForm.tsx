import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiArrowLeft, FiUserPlus } from 'react-icons/fi';
import { AuthInput } from './AuthInput';
import { validateEmail, validatePassword } from '@/lib/auth-utils';
import { AUTH_CONFIG } from '@/lib/auth-config';

interface RegisterFormProps {
    onRegister: (data: any) => Promise<void>;
    onBack: () => void;
    loading: boolean;
}

export function RegisterForm({ onRegister, onBack, loading }: RegisterFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateEmail(email)) {
            setError(AUTH_CONFIG.ERROR_MESSAGES.INVALID_EMAIL);
            return;
        }
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.message || AUTH_CONFIG.ERROR_MESSAGES.WEAK_PASSWORD);
            return;
        }
        if (password !== confirmPassword) {
            setError(AUTH_CONFIG.ERROR_MESSAGES.PASSWORDS_DONT_MATCH);
            return;
        }
        setError(null);
        await onRegister({ email, password });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm mx-auto"
        >
            <button
                onClick={onBack}
                className="flex items-center text-slate-400 hover:text-teal-400 mb-6 transition-colors group"
            >
                <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
                Voltar para login
            </button>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                    Criar Nova Conta
                </h2>
                <p className="text-slate-400">Junte-se a nós neste espaço seguro</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <AuthInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<FiMail className="w-5 h-5" />}
                    placeholder="seu@email.com"
                    disabled={loading}
                />

                <AuthInput
                    label="Senha"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<FiLock className="w-5 h-5" />}
                    placeholder="••••••••"
                    disabled={loading}
                />

                <AuthInput
                    label="Confirmar Senha"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={<FiLock className="w-5 h-5" />}
                    placeholder="••••••••"
                    error={error || undefined}
                    disabled={loading}
                />

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading || !email || !password || !confirmPassword}
                    className={`
            w-full py-3.5 rounded-xl font-bold text-white shadow-lg mt-4
            flex items-center justify-center gap-2
            bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300
          `}
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Criar Conta
                            <FiUserPlus className="w-5 h-5" />
                        </>
                    )}
                </motion.button>
            </form>
        </motion.div>
    );
}
