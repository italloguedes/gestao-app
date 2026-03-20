import React from 'react';
import Link from 'next/link';
import { FiClock, FiUser, FiCalendar, FiArrowRight, FiChevronRight } from 'react-icons/fi';

interface Atendimento {
    id: number;
    nome: string;
    cpf: string;
    email: string;
    solicitante: string;
    protocolo: string;
    dia_atual: string;
    horario: string;
    status: string;
    observacoes?: string;
    [key: string]: any;
}

interface RecentAtendimentosProps {
    atendimentos: Atendimento[];
    loading: boolean;
    onEdit: (atendimento: Atendimento) => void;
}

const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
        case 'concluido':
        case 'entregue':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'em andamento':
        case 'em_andamento':
            return 'bg-teal-50 text-teal-700 border-teal-200';
        case 'pendente':
            return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'correcao':
            return 'bg-red-50 text-red-700 border-red-200';
        case 'cancelado':
            return 'bg-gray-100 text-gray-500 border-gray-200';
        default:
            return 'bg-gray-50 text-gray-600 border-gray-200';
    }
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`;
};

export default function RecentAtendimentos({ atendimentos, loading, onEdit }: RecentAtendimentosProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <FiClock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 leading-tight">Atendimentos Recentes</h2>
                        <p className="text-[11px] text-gray-400 font-medium">Últimas atualizações</p>
                    </div>
                </div>
                <Link
                    href="/dashboard/atendimentos"
                    className="group flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-all duration-200"
                >
                    Ver todos
                    <FiArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="p-3 space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : atendimentos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <FiClock className="h-6 w-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Nenhum atendimento recente</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {atendimentos.map((atendimento) => (
                            <div
                                key={atendimento.id}
                                onClick={() => onEdit(atendimento)}
                                className="group flex items-center justify-between px-5 py-3 hover:bg-emerald-50/40 cursor-pointer transition-colors duration-150"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex-shrink-0">
                                        {atendimento.nome ? atendimento.nome.charAt(0).toUpperCase() : <FiUser className="h-3.5 w-3.5" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-emerald-700 transition-colors">
                                            {atendimento.nome}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                            <FiCalendar className="h-3 w-3" />
                                            <span>{formatDate(atendimento.dia_atual)}</span>
                                            <span className="text-gray-200">•</span>
                                            <span className="font-mono">{atendimento.protocolo}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusStyle(atendimento.status)}`}>
                                        {atendimento.status}
                                    </span>
                                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-gray-300 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all">
                                        <FiChevronRight className="h-3.5 w-3.5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
