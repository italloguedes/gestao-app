import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiCheckCircle, FiClock, FiAlertCircle, FiUserCheck, FiCalendar, FiXCircle } from 'react-icons/fi';

interface DashboardStatsProps {
    stats: {
        total: number;
        correcoes: number;
        emAndamento: number;
        concluidos: number;
        bloqueados: number;
        hoje: number;
        agendamentosPendentes: number;
        agendamentosConfirmados: number;
        agendamentosCancelados: number;
    };
    loading: boolean;
}

export default function DashboardStats({ stats, loading }: DashboardStatsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 w-32 bg-gray-200 rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-gradient-to-br from-blue-50 to-white border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700">Total Atendimentos</CardTitle>
                    <FiUserCheck className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                    <p className="text-xs text-blue-600 mt-1">
                        <span className="font-semibold">{stats.hoje}</span> hoje
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-white border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-700">Concluídos</CardTitle>
                    <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-900">{stats.concluidos}</div>
                    <p className="text-xs text-emerald-600 mt-1">
                        Entregues e finalizados
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-white border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-amber-700">Em Andamento</CardTitle>
                    <FiClock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-amber-900">{stats.emAndamento}</div>
                    <p className="text-xs text-amber-600 mt-1">
                        Aguardando processamento
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-white border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-700">Pendências</CardTitle>
                    <FiAlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-900">{stats.correcoes + stats.bloqueados}</div>
                    <p className="text-xs text-red-600 mt-1">
                        Correções ou bloqueios
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
