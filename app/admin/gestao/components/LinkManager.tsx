'use client';

import { useState } from 'react';
import { generateSchedulingLink, getLinks } from '../actions_pre_agendamento';
import { FiCopy, FiPlus, FiLink } from 'react-icons/fi';
// import { showToast } from '@/lib/utils'; // Removed invalid import

// Basic Toast fallback
const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    alert(msg);
};

export default function LinkManager({ initialLinks }: { initialLinks: any[] }) {
    const [links, setLinks] = useState(initialLinks);
    const [loading, setLoading] = useState(false);
    const [nomeLink, setNomeLink] = useState('');

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await generateSchedulingLink(nomeLink); // Pass name
            if (res.success && res.data) {
                setLinks([res.data, ...links]);
                toast('Link gerado com sucesso!');
                setNomeLink(''); // Clear input
            } else {
                toast('Erro ao gerar link: ' + res.error, 'error');
            }
        } catch (err) {
            toast('Erro ao gerar link', 'error');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (token: string) => {
        const url = `${window.location.origin}/pre-agendamento/${token}`;
        navigator.clipboard.writeText(url);
        toast('Link copiado!');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-emerald-100 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                    <FiLink /> Links de Pré-Agendamento
                </h2>

                <div className="flex gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Nome do Link (ex: Instagram, Campanha X)"
                        value={nomeLink}
                        onChange={(e) => setNomeLink(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none flex-1 md:w-64"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        <FiPlus />
                        {loading ? '...' : 'Gerar'}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-emerald-50 text-emerald-700 uppercase font-semibold">
                        <tr>
                            <th className="px-4 py-3">Nome / Token</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Criado em</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100">
                        {links.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                                    Nenhum link gerado.
                                </td>
                            </tr>
                        ) : (
                            links.map((link) => (
                                <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-800">{link.nome || 'Sem nome'}</div>
                                        <div className="font-mono text-xs text-emerald-600">{link.token}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${link.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {link.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {new Date(link.created_at).toLocaleDateString('pt-BR')} {new Date(link.created_at).toLocaleTimeString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => copyToClipboard(link.token)}
                                            className="text-emerald-600 hover:text-emerald-800 p-1"
                                            title="Copiar Link"
                                        >
                                            <FiCopy size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
