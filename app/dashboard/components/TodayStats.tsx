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
    const today = new Date().toLocaleDateString('pt-BR');

    if (loading) {
        return (
            <div className="w-full h-16 bg-gray-200 animate-pulse rounded-2xl mb-8"></div>
        );
    }

    return (
        <div className="bg-emerald-600 rounded-2xl p-4 shadow-lg mb-8 flex flex-col md:flex-row items-center justify-between gap-4 text-white overflow-x-auto">
            <div className="flex items-center gap-3 bg-emerald-700/50 px-4 py-2 rounded-xl min-w-fit">
                <FiCalendar className="w-6 h-6" />
                <span className="text-xl font-bold">{today}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:justify-end">
                <div className="flex items-center gap-2 bg-emerald-500/30 px-4 py-2 rounded-xl backdrop-blur-sm border border-emerald-400/30 flex-1 md:flex-none justify-center min-w-[120px]">
                    <span className="font-bold text-lg">{total}</span>
                    <span className="text-emerald-100 font-medium">total</span>
                </div>

                <div className="flex items-center gap-2 bg-emerald-500/30 px-4 py-2 rounded-xl backdrop-blur-sm border border-emerald-400/30 flex-1 md:flex-none justify-center min-w-[140px]">
                    <span className="font-bold text-lg">{confirmados}</span>
                    <span className="text-emerald-100 font-medium">confirmados</span>
                </div>

                <div className="flex items-center gap-2 bg-emerald-500/30 px-4 py-2 rounded-xl backdrop-blur-sm border border-emerald-400/30 flex-1 md:flex-none justify-center min-w-[140px]">
                    <span className="font-bold text-lg">{concluidos}</span>
                    <span className="text-emerald-100 font-medium">concluídos</span>
                </div>

                <div className="flex items-center gap-2 bg-lime-500/40 px-4 py-2 rounded-xl backdrop-blur-sm border border-lime-400/30 flex-1 md:flex-none justify-center min-w-[160px]">
                    <FiStar className="w-5 h-5 text-lime-200" />
                    <span className="font-bold text-lg">{preferenciais}</span>
                    <span className="text-lime-100 font-medium">preferenciais</span>
                </div>
            </div>
        </div>
    );
}
