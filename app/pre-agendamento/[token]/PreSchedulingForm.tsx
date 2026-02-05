'use client';

import { useState } from 'react';
import { submitPreAgendamento, checkPreSchedulingStatus } from '../actions';
import { useRouter } from 'next/navigation';
import { FiUpload, FiCheckCircle, FiSearch, FiAlertCircle } from 'react-icons/fi';

export default function PreSchedulingForm({ token }: { token: string }) {
    const [activeTab, setActiveTab] = useState<'new' | 'status'>('new');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [fileName, setFileName] = useState('');

    // Public List State
    const [publicRequests, setPublicRequests] = useState<any[]>([]);
    const [listLoaded, setListLoaded] = useState(false);
    const [listError, setListError] = useState('');

    const router = useRouter();

    const fetchPublicList = async () => {
        setLoading(true);
        setListError('');
        try {
            const { getPublicRequests } = await import('../actions');
            const res = await getPublicRequests(token);
            if (res.success) {
                setPublicRequests(res.data || []);
                setListLoaded(true);
            } else {
                setListError(res.error || 'Erro ao carregar lista.');
            }
        } catch (err) {
            setListError('Erro ao carregar lista.');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab: 'new' | 'status') => {
        setActiveTab(tab);
        if (tab === 'status' && !listLoaded) {
            fetchPublicList();
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        formData.append('token', token);

        try {
            const res = await submitPreAgendamento(formData);
            if (res.success) {
                setSuccess(true);
                setListLoaded(false); // Force reload list next time
            } else {
                alert('Erro: ' + res.error);
            }
        } catch (err) {
            console.error(err);
            alert('Ocorreu um erro ao enviar a solicitação.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileName(e.target.files[0].name);
        } else {
            setFileName('');
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            aprovado: 'bg-green-100 text-green-800 border-green-200',
            rejeitado: 'bg-red-100 text-red-800 border-red-200'
        };
        const activeStyle = styles[status as keyof typeof styles] || styles.pendente;

        return (
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${activeStyle} capitalize`}>
                {status}
            </span>
        );
    };

    if (success) {
        return (
            <div className="text-center p-8 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-emerald-800 mb-2">Solicitação Enviada!</h2>
                <p className="text-emerald-700 mb-6">
                    Seus dados foram recebidos com sucesso.<br />
                    Aguarde a validação da nossa equipe e o agendamento oficial.
                </p>
                <button
                    onClick={() => { setSuccess(false); handleTabChange('status'); }}
                    className="mt-6 text-emerald-600 font-semibold hover:text-emerald-700 underline"
                >
                    Ver lista de agendamentos
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => handleTabChange('new')}
                    className={`flex-1 pb-4 text-sm font-medium text-center transition-colors relative ${activeTab === 'new'
                        ? 'text-emerald-600 border-b-2 border-emerald-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Nova Solicitação
                </button>
                <button
                    onClick={() => handleTabChange('status')}
                    className={`flex-1 pb-4 text-sm font-medium text-center transition-colors relative ${activeTab === 'status'
                        ? 'text-emerald-600 border-b-2 border-emerald-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Lista de Solicitações
                </button>
            </div>

            {/* Disclaimer */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1 flex items-center gap-2">
                    <FiAlertCircle /> Importante:
                </p>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>Esta solicitação não garante o agendamento imediato.</li>
                    <li>Nossa equipe validará a documentação enviada.</li>
                </ul>
            </div>

            {activeTab === 'new' ? (
                <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Nome */}
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <input
                            type="text"
                            name="nome"
                            id="nome"
                            required
                            placeholder="Digite seu nome completo"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                        />
                    </div>

                    {/* Grid for CPF and Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                            <input
                                type="text"
                                name="cpf"
                                id="cpf"
                                required
                                placeholder="000.000.000-00"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                            // Add mask logic if needed, simplify for now
                            />
                        </div>
                        <div>
                            <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                            <input
                                type="tel"
                                name="telefone"
                                id="telefone"
                                required
                                placeholder="(00) 00000-0000"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                            />
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Foto da Certidão (Ou documento comprobatório)</label>
                        <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors group text-center cursor-pointer">
                            <input
                                type="file"
                                name="certidao"
                                id="certidao"
                                accept="image/*,.pdf"
                                required
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                                <div className="p-3 bg-gray-100 rounded-full group-hover:bg-white group-hover:shadow-sm transition-all text-gray-400 group-hover:text-emerald-500">
                                    <FiUpload size={24} />
                                </div>
                                <div className="text-gray-600 font-medium">
                                    {fileName ? (
                                        <span className="text-emerald-600 font-bold">{fileName}</span>
                                    ) : (
                                        <span>Clique para fazer upload ou arraste a imagem</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">PNG, JPG ou PDF (Máx. 5MB)</p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Enviando...
                            </span>
                        ) : (
                            'Solicitar Agendamento'
                        )}
                    </button>
                </form>
            ) : (
                <div className="animate-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Solicitações Recentes</h3>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">{publicRequests.length} solicitações</span>
                    </div>

                    {loading && !listLoaded ? (
                        <div className="text-center py-8 text-gray-500">Carregando lista...</div>
                    ) : listError ? (
                        <div className="text-center py-8 text-red-500">{listError}</div>
                    ) : publicRequests.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">Nenhuma solicitação encontrada neste link.</div>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {publicRequests.map((req, idx) => (
                                <div key={idx} className="bg-white border text-sm border-gray-100 p-4 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                                    <div>
                                        <div className="font-bold text-gray-800">{req.nome}</div>
                                        <div className="text-gray-500 text-xs font-mono mt-0.5">CPF: {req.cpf}</div>
                                        <div className="text-gray-400 text-xs mt-1">{new Date(req.created_at).toLocaleString('pt-BR')}</div>
                                        {req.status === 'rejeitado' && req.motivo && (
                                            <div className="mt-2 text-xs text-red-600 bg-red-50 p-1.5 rounded border border-red-100">
                                                Motivo: {req.motivo}
                                            </div>
                                        )}
                                    </div>
                                    <StatusBadge status={req.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
