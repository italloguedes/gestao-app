'use client';

import { useState } from 'react';
import { submitPreAgendamento } from '../actions';
import { useRouter } from 'next/navigation';
import { FiUpload, FiCheckCircle } from 'react-icons/fi';

export default function PreSchedulingForm({ token }: { token: string }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [fileName, setFileName] = useState('');
    const router = useRouter();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        formData.append('token', token);

        try {
            const res = await submitPreAgendamento(formData);
            if (res.success) {
                setSuccess(true);
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
                <div className="p-4 bg-white rounded-lg border border-emerald-200 text-sm text-gray-500">
                    Você será notificado assim que o agendamento for confirmado.
                </div>
            </div>
        );
    }

    return (
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
    );
}
