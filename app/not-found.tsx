'use client';

import Link from 'next/link';
import { FiHome, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-6">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 text-center max-w-lg">
                {/* Icon */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-200/50 transform -rotate-6">
                            <FiAlertCircle className="w-16 h-16 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                            !
                        </div>
                    </div>
                </div>

                {/* 404 Text */}
                <h1 className="text-8xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-4">
                    404
                </h1>

                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                    Página não encontrada
                </h2>

                <p className="text-slate-500 mb-8 text-lg">
                    Ops! A página que você está procurando não existe ou foi movida.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/"
                        className="group flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200/50 transition-all duration-300 transform hover:-translate-y-1"
                    >
                        <FiHome className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Ir para Página Inicial
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="group flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold shadow-lg border border-slate-200 transition-all duration-300 transform hover:-translate-y-1"
                    >
                        <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Voltar
                    </button>
                </div>

                {/* Footer text */}
                <p className="mt-12 text-sm text-slate-400">
                    Se você acredita que isso é um erro, entre em contato com o suporte.
                </p>
            </div>
        </div>
    );
}
