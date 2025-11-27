"use client";

import React, { useEffect, useState } from 'react';
import { FiX, FiUser, FiPhone, FiClock, FiCheckCircle, FiXCircle, FiStar } from 'react-icons/fi';

interface ChamarProximoModalProps {
    isOpen: boolean;
    onClose: () => void;
    agendamento: {
        id: number;
        nome: string;
        telefone: string;
        cpf: string;
        horario: string;
        atendimento_preferencial?: boolean;
        data_hora_chamada: string;
    } | null;
    onIniciarAtendimento: () => void;
    onLiberar: () => void;
    onAusente?: () => void;
    onCancelar?: () => void;
    loading: boolean;
}

export default function ChamarProximoModal({
    isOpen,
    onClose,
    agendamento,
    onIniciarAtendimento,
    onLiberar,
    onAusente,
    onCancelar,
    loading
}: ChamarProximoModalProps) {
    const [tempoDecorrido, setTempoDecorrido] = useState('');

    useEffect(() => {
        if (!agendamento?.data_hora_chamada) return;

        const updateTempo = () => {
            const agora = new Date();
            const chamada = new Date(agendamento.data_hora_chamada);
            const diffMs = agora.getTime() - chamada.getTime();
            const diffSegundos = Math.floor(diffMs / 1000);

            const minutos = Math.floor(diffSegundos / 60);
            const segundos = diffSegundos % 60;

            if (minutos === 0) {
                setTempoDecorrido(`${segundos}s`);
            } else {
                setTempoDecorrido(`${minutos}m ${segundos}s`);
            }
        };

        updateTempo();
        const interval = setInterval(updateTempo, 1000);

        return () => clearInterval(interval);
    }, [agendamento?.data_hora_chamada]);

    if (!isOpen || !agendamento) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className={`p-6 ${agendamento.atendimento_preferencial
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-green-600'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                <FiUser className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Próximo Agendamento</h2>
                                <p className="text-white/90 text-sm flex items-center gap-2">
                                    <FiClock className="w-4 h-4" />
                                    Chamado há {tempoDecorrido}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center transition-all duration-200"
                        >
                            <FiX className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Tipo de Atendimento */}
                    {agendamento.atendimento_preferencial && (
                        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                                <FiStar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-amber-900 font-bold text-lg">Atendimento Preferencial</p>
                                <p className="text-amber-700 text-sm">Este agendamento tem prioridade no atendimento</p>
                            </div>
                        </div>
                    )}

                    {/* Dados do Agendamento */}
                    <div className="space-y-4 mb-6">
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border-2 border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                                <FiUser className="w-5 h-5 text-slate-600" />
                                <p className="text-sm font-semibold text-slate-600">Nome Completo</p>
                            </div>
                            <p className="text-xl font-bold text-slate-800 ml-8">{agendamento.nome}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <FiPhone className="w-5 h-5 text-blue-600" />
                                    <p className="text-sm font-semibold text-blue-700">Telefone</p>
                                </div>
                                <p className="text-lg font-bold text-blue-900 ml-8">{agendamento.telefone}</p>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border-2 border-indigo-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <FiClock className="w-5 h-5 text-indigo-600" />
                                    <p className="text-sm font-semibold text-indigo-700">Horário</p>
                                </div>
                                <p className="text-lg font-bold text-indigo-900 ml-8">{agendamento.horario.substring(0, 5)}</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
                            <div className="flex items-center gap-3 mb-2">
                                <FiUser className="w-5 h-5 text-purple-600" />
                                <p className="text-sm font-semibold text-purple-700">CPF</p>
                            </div>
                            <p className="text-lg font-bold text-purple-900 ml-8">
                                {agendamento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                            </p>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onIniciarAtendimento}
                            disabled={loading}
                            className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            <FiCheckCircle className="w-5 h-5" />
                            {loading ? 'Iniciando...' : 'Iniciar Atendimento'}
                        </button>

                        <button
                            onClick={onLiberar}
                            disabled={loading}
                            className="flex-1 py-4 px-6 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            <FiXCircle className="w-5 h-5" />
                            {loading ? 'Liberando...' : 'Liberar'}
                        </button>
                    </div>

                    {(onAusente || onCancelar) && (
                        <div className="flex flex-col sm:flex-row gap-3 mt-3">
                            {onAusente && (
                                <button
                                    onClick={onAusente}
                                    disabled={loading}
                                    className="flex-1 py-3 px-6 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    Ausente
                                </button>
                            )}
                            {onCancelar && (
                                <button
                                    onClick={onCancelar}
                                    disabled={loading}
                                    className="flex-1 py-3 px-6 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    )}

                    <p className="text-center text-slate-500 text-sm mt-4">
                        Clique em "Iniciar Atendimento" para marcar como concluído ou "Liberar" para devolver à fila
                    </p>
                </div>
            </div>
        </div>
    );
}
