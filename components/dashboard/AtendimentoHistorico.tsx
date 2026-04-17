'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { FiPlus, FiRefreshCw, FiCheckCircle, FiPackage, FiClock, FiAlertCircle } from 'react-icons/fi';

interface HistoricoItem {
    id: number;
    atendimento_id: number;
    acao: string;
    atendente_nome: string | null;
    detalhes: Record<string, any> | null;
    created_at: string;
}

interface Props {
    atendimentoId: number;
}

const ACAO_CONFIG: Record<string, {
    label: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
}> = {
    criacao: {
        label: 'Atendimento criado',
        icon: <FiPlus className="w-4 h-4" />,
        color: 'text-emerald-700',
        bg: 'bg-emerald-100',
        border: 'border-emerald-300',
    },
    atualizacao_cin: {
        label: 'CIN atualizada',
        icon: <FiRefreshCw className="w-4 h-4" />,
        color: 'text-blue-700',
        bg: 'bg-blue-100',
        border: 'border-blue-300',
    },
    entrega_cin: {
        label: 'CIN entregue',
        icon: <FiPackage className="w-4 h-4" />,
        color: 'text-indigo-700',
        bg: 'bg-indigo-100',
        border: 'border-indigo-300',
    },
    atualizacao_status: {
        label: 'Status atualizado',
        icon: <FiCheckCircle className="w-4 h-4" />,
        color: 'text-amber-700',
        bg: 'bg-amber-100',
        border: 'border-amber-300',
    },
};

function formatDatetime(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Fortaleza',
    });
}

export default function AtendimentoHistorico({ atendimentoId }: Props) {
    const [historico, setHistorico] = useState<HistoricoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!atendimentoId) return;
        setLoading(true);
        setError(null);
        supabase
            .from('atendimento_historico')
            .select('*')
            .eq('atendimento_id', atendimentoId)
            .order('created_at', { ascending: true })
            .then(({ data, error: err }) => {
                if (err) setError(err.message);
                else setHistorico(data || []);
                setLoading(false);
            });
    }, [atendimentoId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center py-8 text-red-500 gap-2">
                <FiAlertCircle className="w-8 h-8" />
                <p className="text-sm font-medium">Erro ao carregar histórico</p>
                <p className="text-xs text-red-400">{error}</p>
            </div>
        );
    }

    if (historico.length === 0) {
        return (
            <div className="flex flex-col items-center py-10 text-slate-400 gap-2">
                <FiClock className="w-10 w-10 mb-1 opacity-40" />
                <p className="text-sm font-medium">Nenhum evento registrado</p>
                <p className="text-xs text-slate-300">As ações serão registradas aqui automaticamente</p>
            </div>
        );
    }

    return (
        <div className="relative px-4 py-4">
            {/* Linha vertical da timeline */}
            <div className="absolute left-[2.35rem] top-4 bottom-4 w-0.5 bg-slate-200 rounded-full" />

            <div className="space-y-5">
                {historico.map((item, idx) => {
                    const cfg = ACAO_CONFIG[item.acao] ?? {
                        label: item.acao,
                        icon: <FiClock className="w-4 h-4" />,
                        color: 'text-slate-700',
                        bg: 'bg-slate-100',
                        border: 'border-slate-300',
                    };

                    return (
                        <div key={item.id} className="flex gap-4 items-start relative">
                            {/* Ícone */}
                            <div className={`relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                                {cfg.icon}
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 shadow-sm min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
                                    <span className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0">
                                        {formatDatetime(item.created_at)}
                                    </span>
                                </div>

                                {item.atendente_nome && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Atendente: <span className="font-semibold text-slate-700">{item.atendente_nome}</span>
                                    </p>
                                )}

                                {/* Detalhes extras */}
                                {item.acao === 'entrega_cin' && item.detalhes && (
                                    <div className="mt-2 bg-indigo-50 rounded-lg p-2.5 space-y-1">
                                        {item.detalhes.recebedor_nome && (
                                            <p className="text-xs text-indigo-700">
                                                <span className="font-semibold">Recebedor:</span> {item.detalhes.recebedor_nome}
                                            </p>
                                        )}
                                        {item.detalhes.recebedor_cpf && (
                                            <p className="text-xs text-indigo-700 font-mono">
                                                <span className="font-semibold font-sans">CPF:</span> {item.detalhes.recebedor_cpf}
                                            </p>
                                        )}
                                        {item.detalhes.vinculo && (
                                            <p className="text-xs text-indigo-700">
                                                <span className="font-semibold">Vínculo:</span> {item.detalhes.vinculo}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {item.acao === 'atualizacao_status' && item.detalhes?.novo_status && (
                                    <p className="text-xs text-amber-700 mt-1">
                                        Novo status: <span className="font-semibold">{item.detalhes.novo_status}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
