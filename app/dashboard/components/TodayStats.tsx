import React from 'react';
import { FiCalendar, FiCheckCircle, FiStar, FiClock } from 'react-icons/fi';

interface TodayStatsProps {
    total: number;
    confirmados: number;
    concluidos: number;
    preferenciais: number;
    loading?: boolean;
}

export default function TodayStats({ total, confirmados, concluidos, preferenciais, loading = false }: TodayStatsProps) {
    const today = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    if (loading) {
        return <div className="w-full h-20 bg-gray-100 animate-pulse rounded-2xl" />;
    }

    const items = [
        { label: 'Agendados', value: total, icon: <FiClock className="h-4 w-4" /> },
        { label: 'Confirmados', value: confirmados, icon: <FiCheckCircle className="h-4 w-4" /> },
        { label: 'Concluídos', value: concluidos, icon: <FiCheckCircle className="h-4 w-4" /> },
        { label: 'Preferenciais', value: preferenciais, icon: <FiStar className="h-4 w-4" /> },
    ];

    return (
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200/30 overflow-hidden">
            <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Date */}
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                        <FiCalendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Hoje</p>
                        <p className="text-white font-bold text-sm capitalize">{today}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-2">
                    {items.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-xl min-w-[110px] justify-center"
                        >
                            <span className="text-white/60">{item.icon}</span>
                            <span className="text-white font-bold text-lg leading-none">{item.value}</span>
                            <span className="text-emerald-100/80 text-xs font-medium">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
