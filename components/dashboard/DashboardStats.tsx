import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiXCircle, FiLock, FiCalendar, FiActivity } from 'react-icons/fi';

interface DashboardStatsProps {
    stats: {
        total: number;
        correcoes: number;
        emAndamento: number;
        concluidos: number;
        bloqueados: number;
        hoje: number;
        agendamentosPendentes: number;

        agendamentosCancelados: number;
    };
    loading: boolean;
}

export default function DashboardStats({ stats, loading }: DashboardStatsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    const statItems = [
        {
            title: 'Total de Atendimentos',
            value: stats.total,
            icon: <FiUsers className="w-6 h-6 text-white" />,
            gradient: 'from-emerald-500 to-teal-600',
            textColor: 'text-emerald-700',
            bgColor: 'bg-emerald-50',
        },
        {
            title: 'Atendimentos Hoje',
            value: stats.hoje,
            icon: <FiCalendar className="w-6 h-6 text-white" />,
            gradient: 'from-blue-500 to-indigo-600',
            textColor: 'text-blue-700',
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Em Andamento',
            value: stats.emAndamento,
            icon: <FiActivity className="w-6 h-6 text-white" />,
            gradient: 'from-amber-500 to-orange-600',
            textColor: 'text-amber-700',
            bgColor: 'bg-amber-50',
        },
        {
            title: 'Correções Pendentes',
            value: stats.correcoes,
            icon: <FiAlertCircle className="w-6 h-6 text-white" />,
            gradient: 'from-red-500 to-pink-600',
            textColor: 'text-red-700',
            bgColor: 'bg-red-50',
        },
    ];

    const secondaryStats = [
        { label: 'Concluídos', value: stats.concluidos, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { label: 'Bloqueados', value: stats.bloqueados, color: 'text-gray-600', bg: 'bg-gray-100' },
        { label: 'Agend. Pendentes', value: stats.agendamentosPendentes, color: 'text-purple-600', bg: 'bg-purple-100' },
        { label: 'Agend. Cancelados', value: stats.agendamentosCancelados, color: 'text-red-600', bg: 'bg-red-100' },
    ];

    return (
        <div className="space-y-6">
            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statItems.map((item, index) => (
                    <div
                        key={index}
                        className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>

                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">{item.title}</p>
                                <h3 className="text-3xl font-bold text-gray-800">{item.value}</h3>
                            </div>
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform duration-300`}>
                                {item.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Secondary Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {secondaryStats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">{stat.label}</span>
                        <span className={`text-lg font-bold ${stat.color} px-2.5 py-0.5 rounded-lg ${stat.bg}`}>
                            {stat.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
