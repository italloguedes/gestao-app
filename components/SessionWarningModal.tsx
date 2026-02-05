"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SessionWarningModalProps {
    isOpen: boolean;
    onRenew: () => void;
    onLogout: () => void;
    expiresIn: number; // Tempo restante em milissegundos
}

export function SessionWarningModal({ isOpen, onRenew, onLogout, expiresIn }: SessionWarningModalProps) {
    const [mounted, setMounted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(expiresIn);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        setTimeLeft(expiresIn);

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1000) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1000;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, expiresIn]);

    if (!mounted || !isOpen) return null;

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 transform transition-all scale-100">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-yellow-600 dark:text-yellow-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Sua sessão vai expirar em breve
                    </h3>

                    <p className="text-gray-500 dark:text-gray-400">
                        Por segurança, sua sessão será encerrada automaticamente em:
                    </p>

                    <div className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Deseja continuar conectado?
                    </p>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onLogout}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            Sair Agora
                        </button>
                        <button
                            onClick={onRenew}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Manter Conectado
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
