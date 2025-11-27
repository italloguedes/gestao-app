"use client";

import React from 'react';
import { FiUsers, FiStar, FiClock, FiAlertCircle } from 'react-icons/fi';

interface FilaControlePanelProps {
    stats: {
        total: number;
        preferenciais: number;
        normais: number;
        proximoTipo: 'preferencial' | 'normal' | null;
    };
    onChamarProximo: () => void;
    loading: boolean;
    agendamentoAtual?: {
        id: number;
        nome: string;
        horario: string;
        atendimento_preferencial?: boolean;
        data_hora_chamada?: string;
    } | null;
}

export default function FilaControlePanel({
    stats,
    onChamarProximo,
    loading,
    agendamentoAtual
}: FilaControlePanelProps) {
    const getTempoDecorrido = (dataHoraChamada: string) => {
        const agora = new Date();
        const chamada = new Date(dataHoraChamada);
        const diffMs = agora.getTime() - chamada.getTime();
        const diffMinutos = Math.floor(diffMs / 60000);

        if (diffMinutos < 1) return 'agora mesmo';
        if (diffMinutos === 1) return '1 minuto atrás';
        return `${diffMinutos} minutos atrás`;
    };

    return (
        <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-xl border-2 border-indigo-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Estatísticas da Fila */}
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
                        <FiUsers className="w-6 h-6 mr-2 text-indigo-600" />
                        Fila de Atendimento
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        {/* Total */}
                        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-slate-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Total na Fila</p>
                                    <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center">
                                    <FiUsers className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Preferenciais */}
                        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-amber-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-amber-700">Preferenciais</p>
                                    <p className="text-3xl font-bold text-amber-600">{stats.preferenciais}</p>
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                                    <FiStar className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Normais */}
                        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-blue-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-blue-700">Normais</p>
                                    <p className="text-3xl font-bold text-blue-600">{stats.normais}</p>
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                    <FiClock className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Próximo Tipo */}
                    {stats.proximoTipo && (
                        <div className={`rounded-xl p-4 border-2 ${stats.proximoTipo === 'preferencial'
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-blue-50 border-blue-300'
                            }`}>
                            <p className="text-sm font-semibold text-slate-700 mb-1">Próximo a ser chamado:</p>
                            <p className={`text-lg font-bold ${stats.proximoTipo === 'preferencial' ? 'text-amber-700' : 'text-blue-700'
                                }`}>
                                {stats.proximoTipo === 'preferencial' ? '⭐ Atendimento Preferencial' : '👤 Atendimento Normal'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Botão Chamar Próximo / Agendamento Atual */}
                <div className="lg:w-96">
                    {agendamentoAtual ? (
                        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 shadow-2xl border-2 border-emerald-400 h-full">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mr-3">
                                    <FiUsers className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-white/90 text-sm font-semibold">Atendimento Atual</p>
                                    <p className="text-white text-xs">
                                        Chamado {agendamentoAtual.data_hora_chamada ? getTempoDecorrido(agendamentoAtual.data_hora_chamada) : 'recentemente'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-4">
                                <p className="text-white text-2xl font-bold mb-2">{agendamentoAtual.nome}</p>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-sm font-semibold">
                                        {agendamentoAtual.horario.substring(0, 5)}
                                    </span>
                                    {agendamentoAtual.atendimento_preferencial && (
                                        <span className="px-3 py-1 bg-amber-500/30 backdrop-blur-md rounded-lg text-white text-sm font-semibold flex items-center gap-1">
                                            <FiStar className="w-3.5 h-3.5" />
                                            Preferencial
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-2">
                                <FiAlertCircle className="w-5 h-5 text-white" />
                                <p className="text-white text-sm">
                                    Conclua ou libere este atendimento antes de chamar o próximo
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center">
                            <button
                                onClick={onChamarProximo}
                                disabled={loading || stats.total === 0}
                                className={`w-full py-8 rounded-2xl font-bold text-2xl transition-all duration-300 shadow-2xl ${stats.total === 0
                                    ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-600 cursor-not-allowed'
                                    : 'bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white transform hover:scale-105 hover:shadow-3xl'
                                    }`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Chamando...
                                    </div>
                                ) : stats.total === 0 ? (
                                    'Fila Vazia'
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <span>🔔 Chamar Próximo</span>
                                        <span className="text-base font-semibold opacity-90">
                                            {stats.proximoTipo === 'preferencial' ? '⭐ Preferencial' : '👤 Normal'}
                                        </span>
                                    </div>
                                )}
                            </button>

                            {stats.total === 0 && (
                                <p className="text-center text-slate-600 mt-4 text-sm">
                                    Não há agendamentos confirmados na fila
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
