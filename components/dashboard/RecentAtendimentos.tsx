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
            return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900';
        case 'em andamento':
        case 'em_andamento':
            return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900';
        case 'pendente':
            return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900';
        case 'correcao':
            return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900';
        case 'cancelado':
            return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        default:
            return 'bg-muted text-muted-foreground border-border';
    }
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

export default function RecentAtendimentos({ atendimentos, loading, onEdit }: RecentAtendimentosProps) {
    return (
        <div className="bg-card rounded-3xl shadow-lg border border-border overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-card to-muted/50">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <FiClock className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-card-foreground">Atendimentos Recentes</h2>
                        <p className="text-xs text-muted-foreground font-medium">Últimas atualizações</p>
                    </div>
                </div>
                <Link
                    href="/dashboard/atendimentos"
                    className="group flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                >
                    Ver todos
                    <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>

            <div className="flex-1 overflow-auto p-2">
                {loading ? (
                    <div className="space-y-2 p-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse border border-border"></div>
                        ))}
                    </div>
                ) : atendimentos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <FiClock className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="font-medium text-muted-foreground">Nenhum atendimento recente</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {atendimentos.map((atendimento) => (
                            <div
                                key={atendimento.id}
                                onClick={() => onEdit(atendimento)}
                                className="group flex items-center justify-between p-4 rounded-xl hover:bg-accent border border-transparent hover:border-border cursor-pointer transition-all duration-200"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${atendimento.nome ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-600 dark:text-gray-300' : 'bg-muted'
                                        }`}>
                                        {atendimento.nome ? atendimento.nome.charAt(0).toUpperCase() : <FiUser />}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                                            {atendimento.nome}
                                        </h3>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <FiCalendar className="h-3 w-3" />
                                                {formatDate(atendimento.dia_atual)}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                            <span className="font-mono">{atendimento.protocolo}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(atendimento.status)}`}>
                                        {atendimento.status}
                                    </span>
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/50 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                                        <FiChevronRight className="h-5 w-5" />
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
