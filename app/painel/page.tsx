'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Chamada {
    id: number;
    nome_publico: string;
    senha: number;
    tipo: 'normal' | 'preferencial';
    status: string;
    atendente_nome?: string;
    horario_chamada: string;
    atendimento_preferencial?: boolean;
}

export default function PainelPage() {
    const [chamadaAtual, setChamadaAtual] = useState<Chamada | null>(null);
    const [historico, setHistorico] = useState<Chamada[]>([]);
    const previousCallId = useRef<number | null>(null);

    const playSound = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = 550; // A bit higher pitch
            gain.gain.value = 0.1;
            osc.start();

            // Bell effect
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1.5);
            osc.stop(ctx.currentTime + 1.5);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    useEffect(() => {
        fetchRecentCalls();
        const interval = setInterval(fetchRecentCalls, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchRecentCalls = async () => {
        try {
            const response = await fetch('/api/painel/chamadas', { cache: 'no-store' });
            if (!response.ok) return;

            const payload = await response.json();
            const current: Chamada | null = payload.current;
            const history: Chamada[] = payload.history || [];

            if (current && previousCallId.current !== null && previousCallId.current !== current.id) {
                playSound();
            }

            previousCallId.current = current?.id ?? null;
            setChamadaAtual(current);
            setHistorico(history);
        } catch (error) {
            console.error('Falha ao carregar painel:', error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-hidden font-sans selection:bg-amber-500/30">
            {/* Header / Logo Area */}
            <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
                        <span className="text-2xl font-bold text-amber-400">S</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-light tracking-wider text-slate-300">SALA SENSORIAL</h1>
                        <p className="text-sm text-slate-500 uppercase tracking-widest">Painel de Chamada</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-mono font-bold text-slate-200">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-slate-500 uppercase text-sm tracking-widest">
                        {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>
            </div>

            <div className="flex h-screen items-center justify-center p-12 gap-12">

                {/* Main Call Display */}
                <div className="flex-1 flex justify-center items-center">
                    <AnimatePresence mode="wait">
                        {chamadaAtual ? (
                            <motion.div
                                key={chamadaAtual.id}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="relative w-full max-w-2xl aspect-square flex flex-col"
                            >
                                {/* Background Glow */}
                                <div className={`absolute inset-0 rounded-full blur-[100px] opacity-30 ${chamadaAtual.tipo === 'preferencial' || chamadaAtual.atendimento_preferencial
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                                    }`} />

                                <div className="relative z-10 bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-2xl flex-1">

                                    <div className="mb-8">
                                        <span className={`px-6 py-2 rounded-full text-lg font-bold tracking-widest uppercase ${chamadaAtual.tipo === 'preferencial' || chamadaAtual.atendimento_preferencial
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            }`}>
                                            {chamadaAtual.tipo === 'preferencial' || chamadaAtual.atendimento_preferencial ? 'Preferencial' : 'Normal'}
                                        </span>
                                    </div>

                                    <div className="mb-4 text-slate-400 uppercase tracking-widest text-xl">Senha</div>
                                    <div className="text-[12rem] leading-none font-bold font-mono text-white mb-8 tracking-tighter">
                                        {String(chamadaAtual.senha || 0).padStart(3, '0')}
                                    </div>

                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8" />

                                    <div className="mb-2 text-slate-400 uppercase tracking-widest text-lg">Cliente</div>
                                    <h2 className="text-5xl font-bold text-white mb-8 truncate w-full px-4">
                                        {chamadaAtual.nome_publico}
                                    </h2>

                                    <div className="flex items-center gap-3 text-slate-400 bg-black/20 px-6 py-3 rounded-full">
                                        <span className="uppercase tracking-widest text-sm">Guichê / Atendente</span>
                                        <span className="w-1 h-1 bg-slate-500 rounded-full" />
                                        <span className="text-white font-medium">{chamadaAtual.atendente_nome || 'Atendente'}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-slate-500 text-2xl font-light tracking-widest uppercase"
                            >
                                Aguardando Chamada...
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* History Sidebar */}
                <div className="w-96 flex flex-col justify-center h-full pt-24">
                    <h3 className="text-slate-500 uppercase tracking-widest mb-8 font-medium border-b border-white/10 pb-4">
                        Últimas Chamadas
                    </h3>

                    <div className="space-y-6">
                        <AnimatePresence>
                            {historico.map((call, i) => (
                                <motion.div
                                    key={call.id}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 50 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white/5 border border-white/5 rounded-xl p-6 flex items-center justify-between backdrop-blur-sm"
                                >
                                    <div>
                                        <div className="text-2xl font-bold font-mono text-slate-300">
                                            {String(call.senha || 0).padStart(3, '0')}
                                        </div>
                                        <div className="text-sm text-slate-500 truncate max-w-[150px]">
                                            {call.nome_publico}
                                        </div>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${call.tipo === 'preferencial' || call.atendimento_preferencial ? 'bg-amber-500' : 'bg-blue-500'
                                        }`} />
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {historico.length === 0 && (
                            <div className="text-slate-600 italic">Histórico vazio</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
