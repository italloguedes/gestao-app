'use client';

import { useState, useEffect } from 'react';
import { generateSchedulingLink, deleteLink } from '../actions_pre_agendamento';
import { FiCopy, FiPlus, FiLink, FiTrash2, FiEye } from 'react-icons/fi';

// Basic Toast fallback
const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    alert(msg);
};

interface LinkManagerProps {
    initialLinks: any[];
    onLinkCreated?: () => void;
    selectedLinkId?: string | null;
    onSelectLink?: (id: string | null) => void;
}

export default function LinkManager({ initialLinks, onLinkCreated, selectedLinkId, onSelectLink }: LinkManagerProps) {
    const [links, setLinks] = useState(initialLinks);
    const [loading, setLoading] = useState(false);
    const [nomeLink, setNomeLink] = useState('');

    useEffect(() => {
        setLinks(initialLinks);
    }, [initialLinks]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            // Get current session token from client Supabase
            // We use the imported supabase client which holds the LocalStorage session
            const { data: { session } } = await import('@/lib/supabase-client').then(m => m.supabase.auth.getSession());

            if (!session?.access_token) {
                toast('Erro de autenticação: Sessão não encontrada', 'error');
                return;
            }

            const res = await generateSchedulingLink(nomeLink, session.access_token);
            if (res.success && res.data) {
                if (onLinkCreated) onLinkCreated();
                toast('Link gerado com sucesso!');
                setNomeLink('');
            } else {
                toast('Erro ao gerar link: ' + res.error, 'error');
            }
        } catch (err) {
            toast('Erro ao gerar link', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row selection
        if (!confirm('Tem certeza que deseja excluir este link?')) return;

        try {
            const { data: { session } } = await import('@/lib/supabase-client').then(m => m.supabase.auth.getSession());
            if (!session?.access_token) return;

            const res = await deleteLink(id, session.access_token);
            if (res.success) {
                toast('Link excluído!');
                if (onLinkCreated) onLinkCreated();
                // If excluding currently selected link, clear selection
                if (selectedLinkId === id && onSelectLink) onSelectLink(null);
            } else {
                toast('Erro ao excluir: ' + res.error, 'error');
            }
        } catch (err) {
            toast('Erro ao excluir link', 'error');
        }
    };

    const copyToClipboard = (e: React.MouseEvent, token: string) => {
        e.stopPropagation(); // Prevent row selection
        const url = `${window.location.origin}/pre-agendamento/${token}`;
        navigator.clipboard.writeText(url);
        toast('Link copiado!');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-emerald-100 mb-8">
            <div className="flex flex-col gap-4 mb-6">
                <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                    <FiLink /> Links de Pré-Agendamento
                </h2>

                <div className="flex flex-col md:flex-row gap-2 w-full">
                    <input
                        type="text"
                        placeholder="Nome do Link (ex: Instagram, Campanha X)"
                        value={nomeLink}
                        onChange={(e) => setNomeLink(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none flex-grow"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 min-w-[120px]"
                    >
                        <FiPlus />
                        {loading ? 'Gerando...' : 'Criar'}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-emerald-50 text-emerald-700 uppercase font-semibold">
                        <tr>
                            <th className="px-4 py-3">Nome / Token</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100">
                        {links.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-4 py-4 text-center text-gray-400">
                                    Nenhum link gerado.
                                </td>
                            </tr>
                        ) : (
                            links.map((link) => (
                                <tr
                                    key={link.id}
                                    onClick={() => onSelectLink && onSelectLink(selectedLinkId === link.id ? null : link.id)}
                                    className={`cursor-pointer transition-colors border-l-4 ${selectedLinkId === link.id
                                            ? 'bg-blue-50 border-blue-500'
                                            : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                            {link.nome || 'Sem nome'}
                                            {selectedLinkId === link.id && <FiEye className="text-blue-500" />}
                                        </div>
                                        <div className="font-mono text-xs text-emerald-600">{link.token}</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {new Date(link.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right flex justify-end gap-2 items-center h-full">
                                        <button
                                            onClick={(e) => copyToClipboard(e, link.token)}
                                            className="text-emerald-600 hover:text-emerald-800 p-2 hover:bg-emerald-100 rounded transition"
                                            title="Copiar Link"
                                        >
                                            <FiCopy size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, link.id)}
                                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-100 rounded transition"
                                            title="Excluir Link"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Clique em um link para filtrar as solicitações.</p>
        </div>
    );
}
