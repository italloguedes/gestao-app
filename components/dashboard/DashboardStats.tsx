import React from 'react';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiXCircle, FiLock, FiCalendar, FiActivity, FiTrendingUp } from 'react-icons/fi';

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    const primary = [
        {
            label: 'Total Atendimentos',
            value: stats.total,
            icon: <FiUsers className="h-5 w-5" />,
            color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            iconBg: 'bg-emerald-100 text-emerald-600',
        },
        {
            label: 'Hoje',
            value: stats.hoje,
            icon: <FiCalendar className="h-5 w-5" />,
            color: 'bg-teal-50 text-teal-600 border-teal-100',
            iconBg: 'bg-teal-100 text-teal-600',
        },
        {
            label: 'Em Andamento',
            value: stats.emAndamento,
            icon: <FiActivity className="h-5 w-5" />,
            color: 'bg-amber-50 text-amber-600 border-amber-100',
            iconBg: 'bg-amber-100 text-amber-600',
        },
        {
            label: 'Correções',
            value: stats.correcoes,
            icon: <FiAlertCircle className="h-5 w-5" />,
            color: 'bg-red-50 text-red-600 border-red-100',
            iconBg: 'bg-red-100 text-red-600',
        },
    ];

    const secondary = [
        { label: 'Concluídos', value: stats.concluidos, icon: <FiCheckCircle className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Bloqueados', value: stats.bloqueados, icon: <FiLock className="h-4 w-4" />, color: 'text-gray-500', bg: 'bg-gray-50' },
        { label: 'Ag. Confirmados', value: stats.agendamentosConfirmados, icon: <FiCheckCircle className="h-4 w-4" />, color: 'text-teal-600', bg: 'bg-teal-50' },
        { label: 'Ag. Cancelados', value: stats.agendamentosCancelados, icon: <FiXCircle className="h-4 w-4" />, color: 'text-red-500', bg: 'bg-red-50' },
    ];

    return (
        <div className="space-y-3">
            {/* Primary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {primary.map((item, i) => (
                    <div
                        key={i}
                        className={`rounded-xl border p-4 ${item.color} transition-all hover:shadow-sm`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{item.label}</p>
                                <p className="text-2xl font-bold mt-1">{item.value}</p>
                            </div>
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${item.iconBg}`}>
                                {item.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {secondary.map((item, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-xl border border-gray-200/80 p-3.5 flex items-center justify-between hover:shadow-sm transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <span className={`${item.color} opacity-60`}>{item.icon}</span>
                            <span className="text-xs font-medium text-gray-500">{item.label}</span>
                        </div>
                        <span className={`text-sm font-bold ${item.color} px-2 py-0.5 rounded-lg ${item.bg}`}>
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
