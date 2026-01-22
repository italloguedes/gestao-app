import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiSend } from 'react-icons/fi';
import { AuthInput } from './AuthInput';
import { validateEmail } from '@/lib/auth-utils';
import { AUTH_CONFIG } from '@/lib/auth-config';

interface RecoverFormProps {
    onRecover: (email: string) => Promise<void>;
    onBack: () => void;
    loading: boolean;
}

export function RecoverForm({ onRecover, onBack, loading }: RecoverFormProps) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateEmail(email)) {
            setError(AUTH_CONFIG.ERROR_MESSAGES.INVALID_EMAIL);
            return;
        }
        setError(null);
        await onRecover(email);
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
                    Recuperar Senha
                </h2>
                <p className="text-slate-400">Informe seu email para receber instruções</p>
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

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading || !email}
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
                            Enviar Email
                            <FiSend className="w-4 h-4" />
                        </>
                    )}
                </motion.button>
            </form>
        </motion.div>
    );
}
