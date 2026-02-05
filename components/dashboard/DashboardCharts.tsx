'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    Legend
} from 'recharts';
import { FiTrendingUp, FiAward, FiActivity, FiUsers } from 'react-icons/fi';

interface ChartData {
    name: string;
    value: number;
    date?: string;
}

interface AttendantRank {
    name: string;
    score: number;
    atendimentos: number;
    coletas: number;
    avatar_url?: string;
}

const PRIMARY_COLOR = '#10b981'; // emerald-500
const SECONDARY_COLOR = '#3b82f6'; // blue-500
const TERTIARY_COLOR = '#f59e0b'; // amber-500
const QUATERNARY_COLOR = '#6366f1'; // indigo-500

const COLORS = [PRIMARY_COLOR, SECONDARY_COLOR, TERTIARY_COLOR, QUATERNARY_COLOR, '#ec4899'];

export default function DashboardCharts() {
    const [loading, setLoading] = useState(true);
    const [trendData, setTrendData] = useState<ChartData[]>([]);
    const [actionData, setActionData] = useState<ChartData[]>([]);
    const [rankingData, setRankingData] = useState<AttendantRank[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

            // 1. Fetch Users
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, auth_id, name');

            if (usersError) throw usersError;

            // 2. Fetch Atendimentos (Last 30 days)
            const { data: atendimentos, error: dataError } = await supabase
                .from('atendimentos')
                .select('*')
                .gte('created_at', dateStr);

            if (dataError) throw dataError;

            processData(atendimentos || [], users || []);
        } catch (error) {
            console.error('Error fetching chart data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processData = (atendimentos: any[], users: any[]) => {
        // --- 1. Daily Trends (Last 7 days approx for better viz, or iterate all)
        // Group by date
        const dateMap = new Map<string, number>();
        // Pre-fill last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const k = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            dateMap.set(k, 0);
        }

        atendimentos.forEach(a => {
            // Use dia_atual (YYYY-MM-DD)
            if (a.dia_atual) {
                const [y, m, d] = a.dia_atual.split('-');
                const key = `${d}/${m}`;
                if (dateMap.has(key)) {
                    dateMap.set(key, (dateMap.get(key) || 0) + 1);
                }
            }
        });

        const trends = Array.from(dateMap.entries()).map(([name, value]) => ({ name, value }));
        setTrendData(trends);

        // --- 2. Top Actions
        let novos = 0;
        let coletas = 0;
        let entregas = 0;
        let concluidos = 0;
        let correcoes = 0;

        atendimentos.forEach(a => {
            novos++; // Every record is a "new attendance" at some point
            if (a.fotos_coletadas) coletas++;
            if (a.status?.toLowerCase() === 'entregue') entregas++;
            if (a.status?.toLowerCase() === 'concluído' || a.status?.toLowerCase() === 'concluido') concluidos++;
            if (a.status?.toLowerCase() === 'correcao') correcoes++;
        });

        const actions = [
            { name: 'Novos Atendimentos', value: novos },
            { name: 'Coletas Digitais', value: coletas },
            { name: 'Entregas RG', value: entregas },
            { name: 'Conclusões', value: concluidos },
        ];
        // Filter out zero values to look cleaner, or keep top 5
        if (correcoes > 0) actions.push({ name: 'Correções', value: correcoes });

        // Sort by value desc
        actions.sort((a, b) => b.value - a.value);
        setActionData(actions.slice(0, 5));

        // --- 3. Attendant Ranking
        const userStats = new Map<string, { name: string, atendimentos: number, coletas: number }>();

        // Map User IDs to Names first
        const userIdToName = new Map<string, string>();
        const authIdToName = new Map<string, string>(); // users table has auth_id often used in usuario_id

        users.forEach(u => {
            userIdToName.set(u.id, u.name);
            if (u.auth_id) authIdToName.set(u.auth_id, u.name);
        });

        atendimentos.forEach(a => {
            // Count Created By (usuario_id)
            // usuario_id might be auth_id (UUID) or numeric id depending on schema version. 
            // Based on NovoAtendimentoModal, it uses user.id which is Auth ID.
            const creatorId = a.usuario_id;
            const creatorName = authIdToName.get(creatorId) || userIdToName.get(creatorId) || a.atendente_nome || 'Desconhecido';

            if (!userStats.has(creatorName)) userStats.set(creatorName, { name: creatorName, atendimentos: 0, coletas: 0 });
            userStats.get(creatorName)!.atendimentos++;

            // Count Collected By (coletor_id)
            if (a.coletor_id) {
                const coletorId = a.coletor_id;
                const coletorName = authIdToName.get(coletorId) || userIdToName.get(coletorId) || a.coletor_nome || 'Desconhecido';

                if (!userStats.has(coletorName)) userStats.set(coletorName, { name: coletorName, atendimentos: 0, coletas: 0 });
                userStats.get(coletorName)!.coletas++;
            }
        });

        const ranking = Array.from(userStats.values())
            .map(u => ({
                ...u,
                score: u.atendimentos + u.coletas
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Top 5

        setRankingData(ranking);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl">
                    <p className="text-sm font-bold text-gray-700">{label}</p>
                    <p className="text-sm text-emerald-600 font-semibold">
                        {payload[0].value} Registros
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
                <div className="bg-gray-200 h-64 rounded-2xl"></div>
                <div className="bg-gray-200 h-64 rounded-2xl"></div>
                <div className="bg-gray-200 h-64 rounded-2xl col-span-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Attendance Trend + Top Actions */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Chart: Daily Trend */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                    <FiTrendingUp />
                                </div>
                                Atendimentos Realizados
                            </h3>
                            <select className="text-sm border-gray-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-gray-500">
                                <option>Últimos 7 dias</option>
                                {/* Future impl: 30 days */}
                            </select>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.2} />
                                            <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 2 }} />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={PRIMARY_COLOR}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart: Top Actions */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <FiActivity />
                            </div>
                            Top Ações Realizadas
                        </h3>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={actionData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        width={120}
                                        tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                        {actionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* Right Column: Attendant Leaderboard */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <FiAward />
                            </div>
                            Ranking Atendentes
                        </h3>
                        <div className="space-y-6">
                            {rankingData.map((user, index) => (
                                <div key={user.name} className="flex items-center gap-4 group">
                                    <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                ${index === 0 ? 'bg-amber-100 text-amber-600 ring-4 ring-amber-50' :
                                            index === 1 ? 'bg-gray-100 text-gray-600 ring-4 ring-gray-50' :
                                                index === 2 ? 'bg-orange-100 text-orange-600 ring-4 ring-orange-50' :
                                                    'bg-slate-50 text-slate-500'}
                            `}>
                                        {index + 1}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors pointer-events-none">
                                                {user.name.split(' ')[0]} {user.name.split(' ').length > 1 ? user.name.split(' ')[1][0] + '.' : ''}
                                            </span>
                                            <span className="font-bold text-gray-900">{user.score}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${index === 0 ? 'bg-amber-400' : 'bg-blue-400'}`}
                                                style={{ width: `${(user.score / (rankingData[0]?.score || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between mt-1 text-[10px] text-gray-400 uppercase font-medium tracking-wide">
                                            <span>{user.atendimentos} Atendimentos</span>
                                            <span>{user.coletas} Coletas</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {rankingData.length === 0 && (
                                <div className="text-center py-10 text-gray-400">
                                    <FiUsers className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">Nenhum dado disponível</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-50">
                            <button className="w-full py-2 text-sm text-gray-500 hover:text-emerald-600 font-medium transition-colors">
                                Ver Relatório Completo
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
