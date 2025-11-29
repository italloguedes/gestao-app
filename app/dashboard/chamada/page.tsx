'use client';

import { useState } from 'react';
import { useCallSystem } from '@/hooks/useCallSystem';
import EditAppointmentModal from '@/app/components/EditAppointmentModal';
import { FiMonitor, FiMic } from 'react-icons/fi';

export default function ChamadaPage() {
    const { callNext, loading, currentCall, setCurrentCall } = useCallSystem();
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');

    const handleCall = async () => {
        setError('');
        try {
            const data = await callNext();
            if (data) {
                setShowModal(true);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto pt-24">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Sistema de Chamada</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center justify-center text-center min-h-[300px] border border-slate-100">
                    <div className="mb-6 bg-blue-50 p-6 rounded-full">
                        <FiMonitor className="w-12 h-12 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2 text-slate-800">Chamar Próximo</h2>
                    <p className="text-slate-500 mb-8 max-w-xs">
                        Clique para chamar o próximo cliente da fila.
                        O sistema prioriza agendamentos preferenciais.
                    </p>

                    <button
                        onClick={handleCall}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg disabled:transform-none"
                    >
                        {loading ? 'Chamando...' : (
                            <>
                                <FiMic className="mr-2" /> CHAMAR PRÓXIMO
                            </>
                        )}
                    </button>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
                    <h2 className="text-xl font-semibold mb-6 border-b pb-4 text-slate-800">Última Chamada</h2>
                    {currentCall ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Senha</span>
                                <span className="text-3xl font-mono font-bold text-slate-800">
                                    {currentCall.senha ? String(currentCall.senha).padStart(3, '0') : '---'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Cliente</span>
                                <span className="font-medium text-slate-800 text-right">{currentCall.nome}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Tipo</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentCall.tipo === 'preferencial' || currentCall.atendimento_preferencial
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    {currentCall.tipo === 'preferencial' || currentCall.atendimento_preferencial ? 'Preferencial' : 'Normal'}
                                </span>
                            </div>

                            <button
                                onClick={() => setShowModal(true)}
                                className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-lg transition border border-slate-200"
                            >
                                Abrir Atendimento
                            </button>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 py-12 flex flex-col items-center">
                            <div className="bg-slate-50 p-4 rounded-full mb-3">
                                <FiMonitor className="w-8 h-8 text-slate-300" />
                            </div>
                            <p>Nenhuma chamada realizada nesta sessão.</p>
                            'use client';

                            import {useState} from 'react';
                            import {useCallSystem} from '@/hooks/useCallSystem';
                            import EditAppointmentModal from '@/app/components/EditAppointmentModal';
                            import {FiMonitor, FiMic} from 'react-icons/fi';

                            export default function ChamadaPage() {
    const {callNext, loading, currentCall, setCurrentCall} = useCallSystem();
                            const [showModal, setShowModal] = useState(false);
                            const [error, setError] = useState('');

    const handleCall = async () => {
                                setError('');
                            try {
            const data = await callNext();
                            if (data) {
                                setShowModal(true);
            }
        } catch (err: any) {
                                setError(err.message);
        }
    };

                            return (
                            <div className="p-6 max-w-4xl mx-auto pt-24">
                                <h1 className="text-2xl font-bold mb-6 text-slate-800">Sistema de Chamada</h1>

                                {error && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center justify-center text-center min-h-[300px] border border-slate-100">
                                        <div className="mb-6 bg-blue-50 p-6 rounded-full">
                                            <FiMonitor className="w-12 h-12 text-blue-600" />
                                        </div>
                                        <h2 className="text-xl font-semibold mb-2 text-slate-800">Chamar Próximo</h2>
                                        <p className="text-slate-500 mb-8 max-w-xs">
                                            Clique para chamar o próximo cliente da fila.
                                            O sistema prioriza agendamentos preferenciais.
                                        </p>

                                        <button
                                            onClick={handleCall}
                                            disabled={loading}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg disabled:transform-none"
                                        >
                                            {loading ? 'Chamando...' : (
                                                <>
                                                    <FiMic className="mr-2" /> CHAMAR PRÓXIMO
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
                                        <h2 className="text-xl font-semibold mb-6 border-b pb-4 text-slate-800">Última Chamada</h2>
                                        {currentCall ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500">Senha</span>
                                                    <span className="text-3xl font-mono font-bold text-slate-800">
                                                        {currentCall.senha ? String(currentCall.senha).padStart(3, '0') : '---'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500">Cliente</span>
                                                    <span className="font-medium text-slate-800 text-right">{currentCall.nome}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500">Tipo</span>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentCall.tipo === 'preferencial' || currentCall.atendimento_preferencial
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {currentCall.tipo === 'preferencial' || currentCall.atendimento_preferencial ? 'Preferencial' : 'Normal'}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => setShowModal(true)}
                                                    className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-lg transition border border-slate-200"
                                                >
                                                    Abrir Atendimento
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center text-slate-400 py-12 flex flex-col items-center">
                                                <div className="bg-slate-50 p-4 rounded-full mb-3">
                                                    <FiMonitor className="w-8 h-8 text-slate-300" />
                                                </div>
                                                <p>Nenhuma chamada realizada nesta sessão.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {showModal && currentCall && (
                                    <EditAppointmentModal
                                        isOpen={showModal}
                                        onClose={() => setShowModal(false)}
                                        appointment={{
                                            ...currentCall,
                                            atendimento_preferencial: currentCall.tipo === 'preferencial' || currentCall.atendimento_preferencial
                                        }}
                                        action="iniciar"
                                        onSave={() => {
                                            setShowModal(false);
                                        }}
                                        onStatusChange={(id, status) => {
                                            if (status === 'concluido') {
                                                setCurrentCall(prev => prev ? { ...prev, status: 'concluido' } : null);
                                            }
                                        }}
                                    />
                                )}
                            </div>
                            );
}
