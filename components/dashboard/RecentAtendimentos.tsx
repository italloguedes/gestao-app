import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiClock, FiUser, FiCalendar, FiArrowRight, FiEdit2, FiChevronRight } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

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

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'concluido':
        case 'entregue':
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'em andamento':
        case 'em_andamento':
            return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'pendente':
            return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'correcao':
            return 'bg-red-100 text-red-700 border-red-200';
        case 'cancelado':
            return 'bg-gray-100 text-gray-700 border-gray-200';
        default:
            return 'bg-gray-50 text-gray-600 border-gray-200';
    }
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

export default function RecentAtendimentos({ atendimentos, loading, onEdit }: RecentAtendimentosProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <FiClock className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800 leading-tight">Atendimentos Recentes</h2>
                        <p className="text-[11px] text-gray-500 font-medium">Últimas atualizações</p>
                    </div>
                </div>
                <Link
                    href="/dashboard/atendimentos"
                    className="group flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all duration-200"
                >
                    Ver todos
                    <FiArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>

            <div className="flex-1 overflow-auto p-1">
                {loading ? (
                    <div className="space-y-2 p-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse border border-gray-100"></div>
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
                    <div className="space-y-1">
                        {atendimentos.map((atendimento) => (
                            <div
                                key={atendimento.id}
                                onClick={() => onEdit(atendimento)}
                                className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 cursor-pointer transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${atendimento.nome ? 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600' : 'bg-gray-100'
                                        }`}>
                                        {atendimento.nome ? atendimento.nome.charAt(0).toUpperCase() : <FiUser />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                                            {atendimento.nome}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <FiCalendar className="h-3 w-3" />
                                                {formatDate(atendimento.dia_atual)}
                                            </span>
                                            <span className="w-0.5 h-0.5 rounded-full bg-gray-300"></span>
                                            <span className="font-mono">{atendimento.protocolo}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(atendimento.status)}`}>
                                        {atendimento.status}
                                    </span>
                                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-gray-300 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                                        <FiChevronRight className="h-4 w-4" />
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
