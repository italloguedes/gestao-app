'use client';

import { useState, useEffect } from 'react';
import { approvePreScheduling, rejectPreScheduling, getAvailableSlots } from '../actions_pre_agendamento';

// ... (other imports)

// ... inside component


// ... (other imports)
import Image from 'next/image';
import { FiCheck, FiX, FiCalendar, FiClock } from 'react-icons/fi';
import { supabase } from '@/lib/supabase-client';

interface Request {
    id: string;
    nome: string;
    cpf: string;
    telefone: string;
    certidao_url: string;
    status: string;
    created_at: string;
}

interface ReviewModalProps {
    request: Request | null;
    onClose: () => void;
    onUpdate: () => void; // Callback to refresh list
}

export default function ReviewModal({ request, onClose, onUpdate }: ReviewModalProps) {
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);

    // Approval form state
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    const [loadingTimes, setLoadingTimes] = useState(false);

    // Rejection state
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        if (date) {
            fetchTimes(date);
        } else {
            setAvailableTimes([]);
        }
    }, [date]);

    // Fetch available times when date changes
    const fetchTimes = async (selectedDate: string) => {
        setLoadingTimes(true);
        setAvailableTimes([]); // Clear previous
        try {
            const res = await getAvailableSlots(selectedDate);
            if (res.success && res.data) {
                setAvailableTimes(res.data);
            } else {
                alert('Erro: ' + (res.error || 'Falha desconhecida ao buscar horários'));
            }
        } catch (error) {
            console.error('Error fetching times', error);
        } finally {
            setLoadingTimes(false);
        }
    };

    const handleConfirm = async () => {
        if (!request) return;
        setLoading(true);
        try {
            // Get session token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                alert('Erro: Sessão inválida. Faça login novamente.');
                return;
            }

            if (action === 'approve') {
                if (!date || !time) {
                    alert('Por favor, selecione data e horário.');
                    setLoading(false);
                    return;
                }
                const res = await approvePreScheduling(request.id, { data: date, horario: time }, token);
                if (res.success) {
                    alert('Solicitação aprovada e agendamento criado!');
                    onUpdate();
                    onClose();
                } else {
                    alert('Erro ao aprovar: ' + res.error);
                }
            } else if (action === 'reject') {
                if (!rejectionReason.trim()) {
                    alert('Por favor, informe o motivo da rejeição.');
                    setLoading(false);
                    return;
                }

                const res = await rejectPreScheduling(request.id, rejectionReason, token);
                if (res.success) {
                    alert('Solicitação rejeitada.');
                    onUpdate();
                    onClose();
                } else {
                    alert('Erro ao rejeitar: ' + res.error);
                }
            }
        } catch (err) {
            alert('Erro ao processar.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!request) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row">

                {/* Image Section */}
                <div className="w-full md:w-1/2 bg-gray-100 p-4 border-r border-gray-200 flex items-center justify-center min-h-[300px]">
                    {request.certidao_url ? (
                        <div className="relative w-full h-full min-h-[300px] flex flex-col">
                            <div className="relative flex-grow w-full h-full min-h-[300px]">
                                <Image
                                    src={request.certidao_url}
                                    alt="Certidão"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                            <a
                                href={request.certidao_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 text-center text-blue-600 hover:text-blue-800 text-sm font-medium underline block"
                            >
                                Abrir imagem original
                            </a>
                        </div>
                    ) : (
                        <span className="text-gray-400">Sem imagem disponível</span>
                    )}
                </div>

                {/* Details Section */}
                <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Análise de Solicitação</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Nome Completo</label>
                            <p className="text-lg font-medium text-gray-900">{request.nome}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">CPF</label>
                                <p className="text-base text-gray-700">{request.cpf}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Telefone</label>
                                <p className="text-base text-gray-700">{request.telefone}</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Solicitado em</label>
                            <p className="text-sm text-gray-600">{new Date(request.created_at).toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto">
                        {!action ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAction('reject')}
                                    className="flex-1 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-semibold flex items-center justify-center gap-2 transition"
                                >
                                    <FiX /> Rejeitar
                                </button>
                                <button
                                    onClick={() => setAction('approve')}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-200"
                                >
                                    <FiCheck /> Aprovar
                                </button>
                            </div>
                        ) : action === 'approve' ? (
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 animate-in fade-in slide-in-from-bottom-2">
                                <h3 className="font-semibold text-emerald-800 mb-3">Agendar Atendimento</h3>

                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-emerald-700 mb-1">Data</label>
                                    <div className="relative">
                                        <FiCalendar className="absolute left-3 top-3 text-emerald-500" />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 rounded border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-emerald-700 mb-1">Horário</label>
                                    <div className="relative">
                                        <FiClock className="absolute left-3 top-3 text-emerald-500" />
                                        <select
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            disabled={loadingTimes || !date}
                                            className="w-full pl-10 pr-3 py-2 rounded border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                                        >
                                            <option value="">Selecione...</option>
                                            {availableTimes.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {loadingTimes && <span className="text-xs text-emerald-600 mt-1">Buscando horários...</span>}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAction(null)}
                                        className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={loading}
                                        className="flex-1 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Confirmando...' : 'Confirmar Aprovação'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 animate-in fade-in slide-in-from-bottom-2">
                                <h3 className="font-semibold text-red-800 mb-2">Rejeitar Solicitação</h3>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-red-700 mb-1">Motivo da Rejeição</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Ex: Documento ilegível, CPF não consta..."
                                        className="w-full p-2 rounded border border-red-200 focus:ring-2 focus:ring-red-500 outline-none text-sm min-h-[80px]"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAction(null)}
                                        className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={loading}
                                        className="flex-1 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Rejeitando...' : 'Confirmar Rejeição'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
