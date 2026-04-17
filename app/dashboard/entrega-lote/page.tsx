'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import { generateLotePDF } from '@/lib/pdf-utils';
import { registrarHistorico } from '@/lib/historico-utils';
import PdfModal from '@/components/dashboard/PdfModal';
import {
    FiSearch, FiUser, FiCheck, FiAlertCircle, FiPrinter,
    FiArrowLeft, FiArrowRight, FiPackage, FiTrash2
} from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface Atendimento {
    id: number; nome: string; cpf: string; protocolo: string;
    dia_atual: string; horario: string; status: string; [key: string]: any;
}

const statusColor = (s: string) => {
    switch ((s || '').toLowerCase()) {
        case 'concluido': case 'entregue': return 'bg-emerald-100 text-emerald-700';
        case 'em andamento': case 'em_andamento': return 'bg-blue-100 text-blue-700';
        case 'pendente': return 'bg-yellow-100 text-yellow-700';
        default: return 'bg-gray-100 text-gray-600';
    }
};
const fmtDate = (d: string) => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
const VINCULOS = ['Próprio (titular)', 'Mãe', 'Pai', 'Irmã(o)', 'Filho(a)', 'Tio(a)', 'Avós', 'Outros'];

type Step = 'selecionar' | 'recebedor' | 'gerando';

export default function EntregaLotePage() {
    const { user } = useAuth();
    const router = useRouter();

    // Busca
    const [busca, setBusca] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [resultados, setResultados] = useState<Atendimento[]>([]);

    // Seleção
    const [selecionados, setSelecionados] = useState<Atendimento[]>([]);

    // Recebedor único
    const [nomeRecebedor, setNomeRecebedor] = useState('');
    const [cpfRecebedor, setCpfRecebedor] = useState('');
    const [vinculo, setVinculo] = useState('');
    const [outroVinculo, setOutroVinculo] = useState('');

    // UI
    const [step, setStep] = useState<Step>('selecionar');
    const [gerandoLote, setGerandoLote] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!user) router.push('/');
    }, [user, router]);

    const buscarAtendimentos = async () => {
        if (!busca) return;
        setBuscando(true);
        setResultados([]);
        try {
            const { data, error } = await supabase
                .from('atendimentos')
                .select('*')
                .neq('status', 'entregue')
                .or(`nome.ilike.%${busca}%,cpf.eq.${busca}`)
                .order('dia_atual', { ascending: false })
                .limit(50);
            if (error) throw error;
            setResultados(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setBuscando(false);
        }
    };

    const inLote = (id: number) => selecionados.some(a => a.id === id);
    const toggle = (a: Atendimento) => setSelecionados(prev =>
        inLote(a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a]
    );
    const remover = (id: number) => setSelecionados(prev => prev.filter(x => x.id !== id));

    const canGerar = nomeRecebedor && cpfRecebedor && vinculo && (vinculo !== 'Outros' || outroVinculo);

    const handleGerarLote = async () => {
        if (!user || !canGerar) return;
        setGerandoLote(true);
        setStep('gerando');
        try {
            const atendenteNome = user.user_metadata?.name || user.user_metadata?.full_name || 'Não identificado';
            const now = new Date();
            const dataEntrega = now.toISOString().split('T')[0];
            const vinculoFinal = vinculo === 'Outros' ? outroVinculo : vinculo;

            await Promise.all(selecionados.map(a =>
                supabase.from('atendimentos').update({
                    nome_recebedor: nomeRecebedor,
                    cpf_recebedor: cpfRecebedor,
                    vinculo: vinculoFinal,
                    data_entrega: dataEntrega,
                    status: 'entregue',
                    data_hora_entrega: now.toISOString(),
                }).eq('id', a.id)
            ));

            // Registrar histórico para cada item
            await Promise.all(selecionados.map(a =>
                registrarHistorico({
                    atendimento_id: a.id,
                    acao: 'entrega_cin',
                    atendente_id: user.id,
                    atendente_nome: atendenteNome,
                    detalhes: {
                        recebedor_nome: nomeRecebedor,
                        recebedor_cpf: cpfRecebedor,
                        vinculo: vinculoFinal,
                    },
                })
            ));

            const res = await fetch('/logoautismo.png');
            const blob = await res.blob();
            const logoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const items = selecionados.map(a => ({
                atendimento: { protocolo: a.protocolo, nome: a.nome, cpf: a.cpf, dia_atual: a.dia_atual },
                recebedor: { nome: nomeRecebedor, cpf: cpfRecebedor, vinculo: vinculoFinal },
            }));

            const url = await generateLotePDF({ items, atendenteNome, dataEntrega, logoBase64 });
            setPdfUrl(url);
        } catch (err) {
            console.error('Erro ao gerar lote:', err);
            alert('Erro ao gerar comprovantes. Tente novamente.');
            setStep('recebedor');
        } finally {
            setGerandoLote(false);
        }
    };

    const reiniciar = () => {
        setSelecionados([]); setBusca(''); setResultados([]);
        setNomeRecebedor(''); setCpfRecebedor(''); setVinculo(''); setOutroVinculo('');
        setStep('selecionar'); setPdfUrl(null);
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {pdfUrl && <PdfModal url={pdfUrl} onClose={reiniciar} />}

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                    <FiArrowLeft className="h-4 w-4 text-gray-600" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                        <FiPackage className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Entrega</p>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Entrega em Lote de CIN</h1>
                    </div>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                {[
                    { key: 'selecionar', label: 'Selecionar CINs', num: 1 },
                    { key: 'recebedor', label: 'Informar Recebedor', num: 2 },
                    { key: 'gerando', label: 'Gerar Comprovantes', num: 3 },
                ].map((s, i, arr) => (
                    <div key={s.key} className="flex items-center flex-1">
                        <div className="flex items-center gap-2 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors
                                ${step === s.key ? 'bg-emerald-600 text-white' :
                                    (step === 'recebedor' && s.key === 'selecionar') || (step === 'gerando') ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-gray-100 text-gray-400'}`}>
                                {(step === 'recebedor' && s.key === 'selecionar') || (step === 'gerando' && s.key !== 'gerando')
                                    ? <FiCheck className="h-4 w-4" /> : s.num}
                            </div>
                            <span className={`text-sm font-medium hidden sm:block ${step === s.key ? 'text-emerald-700' : 'text-gray-400'}`}>
                                {s.label}
                            </span>
                        </div>
                        {i < arr.length - 1 && <div className={`h-0.5 w-8 mx-2 flex-shrink-0 rounded ${step === 'gerando' || (step === 'recebedor' && s.key === 'selecionar') ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
                    </div>
                ))}
            </div>

            {/* ===== STEP 1: SELECIONAR ===== */}
            {step === 'selecionar' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Busca */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Buscar Atendimentos</h2>
                        <div className="flex gap-2">
                            <Input placeholder="Nome ou CPF..." value={busca}
                                onChange={e => setBusca(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') buscarAtendimentos(); }}
                                className="flex-1" />
                            <Button onClick={buscarAtendimentos} disabled={!busca || buscando}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0">
                                {buscando ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSearch className="h-4 w-4" />}
                            </Button>
                        </div>

                        {buscando && <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>}

                        {!buscando && resultados.length === 0 && busca && (
                            <div className="flex flex-col items-center py-6 text-gray-400">
                                <FiAlertCircle className="h-10 w-10 mb-2" />
                                <p className="text-sm">Nenhum atendimento encontrado</p>
                            </div>
                        )}

                        {resultados.length > 0 && (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                <p className="text-xs text-gray-500">{resultados.length} resultado(s)</p>
                                {resultados.map(a => (
                                    <div key={a.id} onClick={() => toggle(a)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none
                                            ${inLote(a.id) ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                                            ${inLote(a.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                            {inLote(a.id) && <FiCheck className="h-3 w-3 text-white" />}
                                        </div>
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${statusColor(a.status)}`}>
                                            <FiUser className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate">{a.nome}</p>
                                            <p className="text-xs text-gray-500">{a.cpf} · {fmtDate(a.dia_atual)}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColor(a.status)}`}>{a.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selecionados */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 flex flex-col">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Selecionados para Entrega</h2>
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">{selecionados.length}</span>
                        </div>

                        {selecionados.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 text-gray-300">
                                <FiPackage className="h-12 w-12 mb-3" />
                                <p className="text-sm font-medium text-gray-400">Nenhum atendimento selecionado</p>
                                <p className="text-xs text-gray-400 mt-1">Use a busca para encontrar e marcar</p>
                            </div>
                        ) : (
                            <div className="flex-1 space-y-2 max-h-80 overflow-y-auto pr-1">
                                {selecionados.map((a, i) => (
                                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                        <span className="text-xs font-bold text-emerald-600 w-5 text-center flex-shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate">{a.nome}</p>
                                            <p className="text-xs text-gray-500">{a.cpf}</p>
                                        </div>
                                        <button onClick={() => remover(a.id)}
                                            className="text-red-400 hover:text-red-600 p-1 rounded transition-colors flex-shrink-0">
                                            <FiTrash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-auto"
                            disabled={selecionados.length === 0}
                            onClick={() => setStep('recebedor')}>
                            Informar Recebedor ({selecionados.length}) <FiArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ===== STEP 2: RECEBEDOR ===== */}
            {step === 'recebedor' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Resumo */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">CINs a Entregar</h2>
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">{selecionados.length}</span>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {selecionados.map((a, i) => (
                                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-xs font-bold text-gray-500 w-5 text-center flex-shrink-0">{i + 1}</span>
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">{a.nome}</p>
                                        <p className="text-xs text-gray-500">{a.cpf} · {fmtDate(a.dia_atual)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Formulário recebedor */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 flex flex-col">
                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Dados do Recebedor</h2>
                        <p className="text-xs text-gray-500">O recebedor abaixo será registrado em <strong>todos os {selecionados.length} comprovante(s)</strong>.</p>

                        <div className="space-y-3 flex-1">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Nome do Recebedor</label>
                                <Input value={nomeRecebedor} onChange={e => setNomeRecebedor(e.target.value)} placeholder="Nome completo" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">CPF do Recebedor</label>
                                <Input value={cpfRecebedor} onChange={e => setCpfRecebedor(e.target.value)} placeholder="000.000.000-00" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Vínculo com os titulares</label>
                                <select value={vinculo} onChange={e => setVinculo(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                    <option value="">Selecione o vínculo</option>
                                    {VINCULOS.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            {vinculo === 'Outros' && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Especifique o vínculo</label>
                                    <Input value={outroVinculo} onChange={e => setOutroVinculo(e.target.value)} placeholder="Descreva o vínculo" />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setStep('selecionar')}>
                                <FiArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={!canGerar || gerandoLote}
                                onClick={handleGerarLote}>
                                <FiPrinter className="mr-2 h-4 w-4" /> Gerar ({selecionados.length})
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== STEP 3: GERANDO ===== */}
            {step === 'gerando' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold text-gray-800">Gerando comprovantes...</p>
                        <p className="text-sm text-gray-500 mt-1">Salvando {selecionados.length} entrega(s) e criando o PDF</p>
                    </div>
                </div>
            )}
        </div>
    );
}
