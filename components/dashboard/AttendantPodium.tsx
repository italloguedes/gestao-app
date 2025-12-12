'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { FiAward, FiUsers } from 'react-icons/fi';

interface AttendantRank {
    name: string;
    score: number;
    atendimentos: number;
    coletas: number;
    avatar_url?: string;
}

export default function AttendantPodium() {
    const [loading, setLoading] = useState(true);
    const [ranking, setRanking] = useState<AttendantRank[]>([]);

    useEffect(() => {
        fetchRanking();
    }, []);

    const fetchRanking = async () => {
        try {
            setLoading(true);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const dateStr = sevenDaysAgo.toISOString().split('T')[0];

            // Fetch Atendimentos (Last 7 days)
            const { data: atendimentos, error: dataError } = await supabase
                .from('atendimentos')
                .select('*')
                .gte('created_at', dateStr);

            if (dataError) throw dataError;

            processRanking(atendimentos || []);
        } catch (error) {
            console.error('Error fetching ranking:', error);
        } finally {
            setLoading(false);
        }
    };

    const processRanking = (atendimentos: any[]) => {
        const userStats = new Map<string, { name: string, atendimentos: number, coletas: number }>();

        const getOrInitStats = (nome: string) => {
            if (!userStats.has(nome)) {
                userStats.set(nome, {
                    name: nome,
                    atendimentos: 0,
                    coletas: 0
                });
            }
            return userStats.get(nome)!;
        };

        atendimentos.forEach(a => {
            // Count Created By (atendente_nome)
            if (a.atendente_nome) {
                const stats = getOrInitStats(a.atendente_nome);
                stats.atendimentos++;
            }

            // Count Collected By (coletor_nome) ONLY if fotos_coletadas is true
            if (a.coletor_nome && a.fotos_coletadas) {
                const stats = getOrInitStats(a.coletor_nome);
                stats.coletas++;
            }
        });

        // Filter out unwanted names
        const ignoredNames = ['Desconhecido', 'Não identificado', 'Super Administrador'];

        const sortedRanking = Array.from(userStats.values())
            .filter(u => !ignoredNames.includes(u.name))
            .map(u => ({
                ...u,
                score: u.atendimentos + u.coletas
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // Top 3 only for Podium

        setRanking(sortedRanking);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 h-full animate-pulse">
                <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
                <div className="flex items-end justify-center gap-4 h-48">
                    <div className="w-1/3 bg-gray-200 rounded-t-lg h-24"></div>
                    <div className="w-1/3 bg-gray-200 rounded-t-lg h-32"></div>
                    <div className="w-1/3 bg-gray-200 rounded-t-lg h-16"></div>
                </div>
            </div>
        );
    }

    // Helper to get first name
    const getFirstName = (fullName: string) => fullName.split(' ')[0];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 h-full flex flex-col">
            <h2 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                    <FiAward className="h-4 w-4" />
                </div>
                Ranking (7 dias)
            </h2>

            {ranking.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <FiUsers className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Sem dados recentes</p>
                </div>
            ) : (
                <div className="flex-1 flex items-end justify-center gap-2 pb-2">

                    {/* Second Place (Left) */}
                    <div className="flex flex-col items-center w-1/3">
                        <div className="mb-2 text-center">
                            <span className="text-xs font-bold text-gray-700 block truncate max-w-[80px]">
                                {ranking[1] ? getFirstName(ranking[1].name) : '-'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                                {ranking[1] ? ranking[1].score : 0} ações
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-t-xl h-24 flex items-end justify-center pb-2 relative group">
                            {ranking[1] && (
                                <div className="absolute -top-3 w-8 h-8 rounded-full bg-slate-300 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-700">
                                    2º
                                </div>
                            )}
                        </div>
                    </div>

                    {/* First Place (Center, Tallest) */}
                    <div className="flex flex-col items-center w-1/3 z-10 -mx-1">
                        <div className="mb-2 text-center">
                            <span className="text-xs font-bold text-amber-600 block truncate max-w-[90px]">
                                {ranking[0] ? getFirstName(ranking[0].name) : '-'}
                            </span>
                            <span className="text-[10px] text-amber-600/80 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                                {ranking[0] ? ranking[0].score : 0} ações
                            </span>
                        </div>
                        <div className="w-full bg-gradient-to-b from-amber-300 to-amber-400 rounded-t-xl h-32 flex items-end justify-center pb-2 relative shadow-lg">
                            {ranking[0] && (
                                <div className="absolute -top-4 w-10 h-10 rounded-full bg-amber-200 border-4 border-white shadow-md flex items-center justify-center text-lg font-black text-amber-700">
                                    1º
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Third Place (Right) */}
                    <div className="flex flex-col items-center w-1/3">
                        <div className="mb-2 text-center">
                            <span className="text-xs font-bold text-gray-700 block truncate max-w-[80px]">
                                {ranking[2] ? getFirstName(ranking[2].name) : '-'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                                {ranking[2] ? ranking[2].score : 0} ações
                            </span>
                        </div>
                        <div className="w-full bg-orange-100 rounded-t-xl h-16 flex items-end justify-center pb-2 relative">
                            {ranking[2] && (
                                <div className="absolute -top-3 w-8 h-8 rounded-full bg-orange-200 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-orange-700">
                                    3º
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
