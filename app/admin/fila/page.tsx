"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/apiClient";
import FilaControlePanel from "@/components/FilaControlePanel";
import ChamarProximoModal from "@/components/ChamarProximoModal";
import { FiClock, FiUser, FiAlertCircle } from "react-icons/fi";

// Types
interface Agendamento {
    id: number;
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
    data: string;
    horario: string;
    status: string;
    data_nascimento: string;
    tipo_cancelamento?: string;
    atendimento_preferencial?: boolean;
    atendente_atual_id?: string;
    atendente_atual_nome?: string;
    data_hora_chamada?: string;
}

export default function FilaPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // State
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [filaLoading, setFilaLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Queue State
    const [agendamentoChamado, setAgendamentoChamado] = useState<Agendamento | null>(null);
    const [isChamarModalOpen, setIsChamarModalOpen] = useState(false);
    const [filaStats, setFilaStats] = useState({
        total: 0,
        preferenciais: 0,
        normais: 0,
        proximoTipo: null as 'preferencial' | 'normal' | null
    });

    // Load Queue Stats
    const loadFilaStats = useCallback(async () => {
        try {
            const { data, error } = await apiClient.get('/api/agendamentos/fila');
            if (error) throw error;
            setFilaStats(data);
        } catch (err) {
            console.error("Erro ao carregar estatísticas da fila:", err);
        }
    }, []);

    // Load Appointments
    const loadAgendamentos = useCallback(async () => {
        setLoading(true);
        try {
            const hoje = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from("agendamentos")
                .select("id, nome, email, cpf, telefone, data, horario, status, data_nascimento, tipo_cancelamento, atendimento_preferencial, observacoes, atendente_atual_id, atendente_atual_nome, data_hora_chamada")
                .eq("data", hoje)
                .in("status", ["pendente", "concluido", "ausente", "cancelado"]) // Fetch relevant statuses
                .order("horario", { ascending: true });

            if (error) throw error;
            setAgendamentos(data || []);

            // Load queue stats and check for current appointment
            if (user) {
                await loadFilaStats();
                const meuAgendamento = (data || []).find((a: any) =>
                    a.atendente_atual_id === user.id && a.status === 'pendente'
                );
                setAgendamentoChamado(meuAgendamento || null);
                if (meuAgendamento) {
                    setIsChamarModalOpen(true);
                }
            }
        } catch (err) {
            console.error("Erro ao carregar agendamentos:", err);
        } finally {
            setLoading(false);
        }
    }, [user, loadFilaStats]);

    // Initial Load
    useEffect(() => {
        if (!authLoading && user) {
            loadAgendamentos();

            // Auto refresh every 30 seconds
            const interval = setInterval(() => {
                loadAgendamentos();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [authLoading, user, loadAgendamentos]);

    // Actions
    const ensureValidSession = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            console.error('Sessão inválida ou expirada');
            return false;
        }
        return true;
    };

    const handleChamarProximo = async () => {
        if (!user) return;

        setFilaLoading(true);
        try {
            const sessionValid = await ensureValidSession();
            if (!sessionValid) {
                alert('Sua sessão expirou. Por favor, faça login novamente.');
                router.push('/?session_expired=true');
                return;
            }

            // Get user name
            const { data: userData } = await supabase
                .from('users')
                .select('name')
                .eq('auth_id', user.id)
                .single();

            const nomeUsuario = userData?.name || user.user_metadata?.name || user.user_metadata?.full_name || 'Atendente';

            const { data, error } = await apiClient.post('/api/agendamentos/fila/chamar-proximo', {
                userId: user.id,
                userName: nomeUsuario
            });

            if (error) {
                alert(`Erro ao chamar próximo agendamento: ${error}`);
                return;
            }

            setAgendamentoChamado(data.agendamento);
            setIsChamarModalOpen(true);
            await loadAgendamentos();
        } catch (err) {
            console.error('Erro ao chamar próximo:', err);
            alert('Erro ao chamar próximo agendamento. Tente novamente.');
        } finally {
            setFilaLoading(false);
        }
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        try {
            const { error } = await supabase
                .from("agendamentos")
                .update({ status: newStatus })
                .eq("id", id);

            if (error) throw error;
            await loadAgendamentos();
        } catch (err) {
            console.error(`Erro ao mudar status para ${newStatus}:`, err);
            throw err;
        }
    };

    const handleIniciarAtendimento = async () => {
        if (!agendamentoChamado) return;

        setActionLoading(true);
        try {
            await handleStatusChange(agendamentoChamado.id, 'concluido');
            setIsChamarModalOpen(false);
            setAgendamentoChamado(null);
            await loadAgendamentos();
        } catch (err) {
            console.error('Erro ao iniciar atendimento:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLiberarAgendamento = async () => {
        if (!agendamentoChamado) return;

        setActionLoading(true);
        try {
            const { error } = await apiClient.post('/api/agendamentos/fila/liberar', {
                agendamentoId: agendamentoChamado.id
            });

            if (error) throw error;

            setIsChamarModalOpen(false);
            setAgendamentoChamado(null);
            await loadAgendamentos();
        } catch (err) {
            console.error('Erro ao liberar agendamento:', err);
            alert('Erro ao liberar agendamento.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAusente = async () => {
        if (!agendamentoChamado) return;
        if (!confirm("Marcar paciente como ausente?")) return;

        setActionLoading(true);
        try {
            await handleStatusChange(agendamentoChamado.id, 'ausente');
            setIsChamarModalOpen(false);
            setAgendamentoChamado(null);
            await loadAgendamentos();
        } catch (err) {
            console.error('Erro ao marcar como ausente:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelar = async () => {
        if (!agendamentoChamado) return;
        if (!confirm("Cancelar este agendamento?")) return;

        setActionLoading(true);
        try {
            await handleStatusChange(agendamentoChamado.id, 'cancelado');
            setIsChamarModalOpen(false);
            setAgendamentoChamado(null);
            await loadAgendamentos();
        } catch (err) {
            console.error('Erro ao cancelar:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // Filter appointments for display
    const filaDeEspera = useMemo(() => {
        return agendamentos.filter(a => a.status === 'pendente' && !a.atendente_atual_id);
    }, [agendamentos]);

    if (authLoading) return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div></div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Fila de Atendimento</h1>
                        <p className="text-gray-500">Gerencie a chamada de senhas e atendimentos</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                        <FiUser className="w-4 h-4" />
                        <span>{user?.user_metadata?.name || user?.email}</span>
                    </div>
                </div>

                {/* Control Panel */}
                <FilaControlePanel
                    stats={filaStats}
                    onChamarProximo={handleChamarProximo}
                    loading={filaLoading}
                    agendamentoAtual={agendamentoChamado}
                />

                {/* Queue List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">Próximos na Fila</h2>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {filaDeEspera.length} aguardando
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Horário</th>
                                    <th scope="col" className="px-6 py-3">Paciente</th>
                                    <th scope="col" className="px-6 py-3">Tipo</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filaDeEspera.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <FiClock className="w-8 h-8 text-gray-300" />
                                                <p>Nenhum paciente na fila de espera</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filaDeEspera.map((agendamento) => (
                                        <tr key={agendamento.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {agendamento.horario.slice(0, 5)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{agendamento.nome}</div>
                                                <div className="text-xs text-gray-500">{agendamento.cpf}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {agendamento.atendimento_preferencial ? (
                                                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded border border-purple-200">
                                                        Preferencial
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-200">
                                                        Normal
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded border border-yellow-200">
                                                    Aguardando
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <ChamarProximoModal
                isOpen={isChamarModalOpen}
                onClose={() => { }} // Prevent closing without action
                agendamento={agendamentoChamado}
                onIniciarAtendimento={handleIniciarAtendimento}
                onLiberar={handleLiberarAgendamento}
                loading={actionLoading}
            />

            {/* Custom buttons for Cancel/Absent inside the modal are not supported by the component props directly 
          Wait, ChamarProximoModal only has onIniciarAtendimento and onLiberar.
          The user asked for "iniciar, cancelar, ausente, cancelado".
          I need to update ChamarProximoModal to support these actions or add them to the modal logic.
      */}
        </div>
    );
}
