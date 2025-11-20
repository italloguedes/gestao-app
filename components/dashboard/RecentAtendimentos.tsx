import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiClock, FiUser, FiCalendar } from 'react-icons/fi';

interface Atendimento {
    id: number;
    nome: string;
    cpf: string;
    protocolo: string;
    dia_atual: string;
    horario: string;
    status: string;
}

interface RecentAtendimentosProps {
    atendimentos: Atendimento[];
    loading: boolean;
}

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'concluido':
        case 'entregue':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'em andamento':
        case 'em_andamento':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'pendente':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'cancelado':
            return 'bg-red-100 text-red-800 border-red-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

export default function RecentAtendimentos({ atendimentos, loading }: RecentAtendimentosProps) {
    return (
        <Card className="col-span-1 lg:col-span-4 shadow-md border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <CardHeader className="border-b border-gray-50 bg-gray-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                        <FiClock className="mr-2 text-emerald-600" />
                        Atendimentos Recentes
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-4 space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between animate-pulse">
                                <div className="flex items-center space-x-4">
                                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                                    </div>
                                </div>
                                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                            </div>
                        ))}
                    </div>
                ) : atendimentos.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Nenhum atendimento recente encontrado.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {atendimentos.map((atendimento) => (
                            <div
                                key={atendimento.id}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-150"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                                        <FiUser className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{atendimento.nome}</p>
                                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                            <FiCalendar className="mr-1 h-3 w-3" />
                                            {formatDate(atendimento.dia_atual)} às {atendimento.horario}
                                            <span className="mx-2">•</span>
                                            <span className="font-mono">{atendimento.protocolo}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                            atendimento.status
                                        )}`}
                                    >
                                        {atendimento.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
