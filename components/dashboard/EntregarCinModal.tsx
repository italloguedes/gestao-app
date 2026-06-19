import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiUser, FiCheck, FiAlertCircle, FiPrinter, FiList } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Atendimento {
    id: number; nome: string; cpf: string; email: string; solicitante: string;
    protocolo: string; dia_atual: string; horario: string; status: string;
    observacoes?: string; [key: string]: any;
}

export interface ItemLoteExport {
    atendimento: Atendimento;
    nomeRecebedor: string; cpfRecebedor: string; vinculo: string; outroVinculo: string;
}

interface EntregarCinModalProps {
    show: boolean; onClose: () => void; atendimentos: Atendimento[];
    onBuscar: () => void; busca: string; setBusca: (v: string) => void;
    buscando: boolean; loading: boolean;
    onSelect: (a: Atendimento | null) => void; selected: Atendimento | null;
    nomeRecebedor: string; setNomeRecebedor: (v: string) => void;
    cpfRecebedor: string; setCpfRecebedor: (v: string) => void;
    vinculo: string; setVinculo: (v: string) => void;
    outroVinculo: string; setOutroVinculo: (v: string) => void;
    gerandoComprovante: boolean; onGerarComprovante: () => void;
    gerandoLote: boolean; onGerarLote: (items: ItemLoteExport[]) => void;
}

const statusColor = (s: string) => {
    switch (s.toLowerCase()) {
        case 'concluido': case 'entregue': return 'bg-emerald-100 text-emerald-800';
        case 'em andamento': case 'em_andamento': return 'bg-blue-100 text-blue-800';
        case 'pendente': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};
const fmtDate = (d: string) => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
const VINCULOS = ['Próprio (titular)', 'Mãe', 'Pai', 'Irmã(o)', 'Filho(a)', 'Tio(a)', 'Avós', 'Outros'];

export default function EntregarCinModal({
    show, onClose, atendimentos, onBuscar, busca, setBusca, buscando, loading,
    onSelect, selected, nomeRecebedor, setNomeRecebedor, cpfRecebedor, setCpfRecebedor,
    vinculo, setVinculo, outroVinculo, setOutroVinculo,
    gerandoComprovante, onGerarComprovante, gerandoLote, onGerarLote,
}: EntregarCinModalProps) {
    const [modo, setModo] = useState<'individual' | 'lote'>('individual');
    const [loteStep, setLoteStep] = useState<'buscar' | 'configurar'>('buscar');
    const [selecionados, setSelecionados] = useState<Atendimento[]>([]);

    // Recebedor único para o lote
    const [loteNome, setLoteNome] = useState('');
    const [loteCpf, setLoteCpf] = useState('');
    const [loteVinculo, setLoteVinculo] = useState('');
    const [loteOutroVinculo, setLoteOutroVinculo] = useState('');

    useEffect(() => {
        if (!show) {
            setModo('individual'); setLoteStep('buscar');
            setSelecionados([]); setLoteNome(''); setLoteCpf('');
            setLoteVinculo(''); setLoteOutroVinculo('');
        }
    }, [show]);

    const switchModo = (m: 'individual' | 'lote') => {
        setModo(m); setLoteStep('buscar'); setSelecionados([]);
        setLoteNome(''); setLoteCpf(''); setLoteVinculo(''); setLoteOutroVinculo('');
        onSelect(null);
    };

    const inLote = (id: number) => selecionados.some(a => a.id === id);
    const toggle = (a: Atendimento) => setSelecionados(prev =>
        inLote(a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a]
    );

    const canGerar = loteNome && loteCpf && loteVinculo && (loteVinculo !== 'Outros' || loteOutroVinculo);

    const handleGerarLote = () => {
        const vinculoFinal = loteVinculo === 'Outros' ? loteOutroVinculo : loteVinculo;
        onGerarLote(selecionados.map(a => ({
            atendimento: a,
            nomeRecebedor: loteNome,
            cpfRecebedor: loteCpf,
            vinculo: vinculoFinal,
            outroVinculo: loteOutroVinculo,
        })));
    };

    if (!show) return null;

    const SearchBar = () => (
        <div className="mb-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Buscar por nome ou CPF</label>
            <div className="flex gap-2">
                <Input placeholder="Digite o nome ou CPF" value={busca}
                    onChange={e => setBusca(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') onBuscar(); }} autoFocus className="flex-1" />
                <Button onClick={onBuscar} disabled={!busca || buscando} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {buscando
                        ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <FiSearch className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative border border-emerald-100 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors" onClick={onClose}>
                    <FiX className="h-5 w-5" />
                </button>
                <div className="flex items-center mb-5">
                    <div className="bg-emerald-100 p-3 rounded-xl mr-3"><FiCheck className="h-6 w-6 text-emerald-600" /></div>
                    <h2 className="text-xl font-bold text-emerald-700">Entregar CIN</h2>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
                    <button onClick={() => switchModo('individual')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${modo === 'individual' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
                        <FiUser className="h-3.5 w-3.5" /> Individual
                    </button>
                    <button onClick={() => switchModo('lote')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${modo === 'lote' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
                        <FiList className="h-3.5 w-3.5" /> Em Lote
                    </button>
                </div>

                {/* ===== INDIVIDUAL ===== */}
                {modo === 'individual' && !selected && (
                    <div>
                        <SearchBar />
                        {loading ? (
                            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
                        ) : atendimentos.length === 0 && busca ? (
                            <div className="flex flex-col items-center py-8 text-gray-400">
                                <FiAlertCircle className="h-10 w-10 mb-2" /><p className="text-sm">Nenhum atendimento encontrado</p>
                            </div>
                        ) : atendimentos.length > 0 ? (
                            <div>
                                <p className="text-xs text-gray-500 mb-2">{atendimentos.length} encontrado(s)</p>
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                    {atendimentos.map(a => (
                                        <div key={a.id} onClick={() => onSelect(a)}
                                            className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:shadow-sm cursor-pointer transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${statusColor(a.status)}`}>
                                                    <FiUser className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 text-sm">{a.nome}</p>
                                                    <p className="text-xs text-gray-500">{a.cpf} · {fmtDate(a.dia_atual)}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(a.status)}`}>{a.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {modo === 'individual' && selected && (
                    <div className="space-y-5">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Dados do Atendimento</h3>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-3 text-sm">
                                <div><p className="text-gray-400 text-xs">Nome</p><p className="font-medium">{selected.nome}</p></div>
                                <div><p className="text-gray-400 text-xs">CPF</p><p className="font-medium">{selected.cpf}</p></div>
                                <div><p className="text-gray-400 text-xs">Data</p><p className="font-medium">{fmtDate(selected.dia_atual)}</p></div>
                                <div><p className="text-gray-400 text-xs">Protocolo</p><p className="font-medium">{selected.protocolo}</p></div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><FiUser className="text-emerald-500" /> Dados do Recebedor</h3>
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
                                <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm"
                                    onClick={() => { setNomeRecebedor(selected.nome); setCpfRecebedor(selected.cpf); setVinculo('Próprio (titular)'); }}>
                                    Marcar como próprio titular
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><label className="text-xs font-medium text-gray-600">Nome Recebedor</label>
                                        <Input value={nomeRecebedor} onChange={e => setNomeRecebedor(e.target.value)} placeholder="Nome completo" /></div>
                                    <div className="space-y-1"><label className="text-xs font-medium text-gray-600">CPF Recebedor</label>
                                        <Input value={cpfRecebedor} onChange={e => setCpfRecebedor(e.target.value)} placeholder="000.000.000-00" /></div>
                                </div>
                                <div className="space-y-1"><label className="text-xs font-medium text-gray-600">Vínculo</label>
                                    <select value={vinculo} onChange={e => setVinculo(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                        <option value="">Selecione</option>
                                        {VINCULOS.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                {vinculo === 'Outros' && (
                                    <div className="space-y-1"><label className="text-xs font-medium text-gray-600">Especifique</label>
                                        <Input value={outroVinculo} onChange={e => setOutroVinculo(e.target.value)} placeholder="Especifique o vínculo" /></div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => onSelect(null)}>Voltar</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={!nomeRecebedor || !cpfRecebedor || !vinculo || (vinculo === 'Outros' && !outroVinculo) || gerandoComprovante}
                                onClick={onGerarComprovante}>
                                {gerandoComprovante
                                    ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Gerando...</>
                                    : <><FiPrinter className="mr-2 h-4 w-4" />Gerar e Imprimir</>}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ===== LOTE - STEP 1: SELECIONAR ===== */}
                {modo === 'lote' && loteStep === 'buscar' && (
                    <div>
                        <SearchBar />
                        {loading ? (
                            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
                        ) : atendimentos.length === 0 && busca ? (
                            <div className="flex flex-col items-center py-8 text-gray-400">
                                <FiAlertCircle className="h-10 w-10 mb-2" /><p className="text-sm">Nenhum atendimento encontrado</p>
                            </div>
                        ) : atendimentos.length > 0 ? (
                            <div>
                                <p className="text-xs text-gray-500 mb-2">{atendimentos.length} encontrado(s) — marque os que deseja entregar</p>
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {atendimentos.map(a => (
                                        <div key={a.id} onClick={() => toggle(a)}
                                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${inLote(a.id) ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-white hover:shadow-sm'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${inLote(a.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                                    {inLote(a.id) && <FiCheck className="h-3 w-3 text-white" />}
                                                </div>
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${statusColor(a.status)}`}>
                                                    <FiUser className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 text-sm">{a.nome}</p>
                                                    <p className="text-xs text-gray-500">{a.cpf} · {fmtDate(a.dia_atual)}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(a.status)}`}>{a.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {selecionados.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">
                                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full mr-2">{selecionados.length}</span>
                                    selecionado(s)
                                </span>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                                    onClick={() => setLoteStep('configurar')}>
                                    Informar Recebedor →
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== LOTE - STEP 2: RECEBEDOR ÚNICO ===== */}
                {modo === 'lote' && loteStep === 'configurar' && (
                    <div className="space-y-5">
                        {/* Resumo dos selecionados */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-sm font-semibold text-emerald-700 mb-2">
                                {selecionados.length} CIN(s) selecionada(s)
                            </p>
                            <div className="space-y-1 max-h-28 overflow-y-auto">
                                {selecionados.map(a => (
                                    <p key={a.id} className="text-xs text-emerald-800">• {a.nome} <span className="text-emerald-600">({a.cpf})</span></p>
                                ))}
                            </div>
                        </div>

                        {/* Formulário único de recebedor */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <FiUser className="text-emerald-500" />
                                Recebedor (para todos os documentos)
                            </h3>
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Nome do Recebedor</label>
                                        <Input value={loteNome} onChange={e => setLoteNome(e.target.value)} placeholder="Nome completo" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">CPF do Recebedor</label>
                                        <Input value={loteCpf} onChange={e => setLoteCpf(e.target.value)} placeholder="000.000.000-00" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-600">Vínculo com os titulares</label>
                                    <select value={loteVinculo} onChange={e => setLoteVinculo(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                        <option value="">Selecione</option>
                                        {VINCULOS.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                {loteVinculo === 'Outros' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Especifique o vínculo</label>
                                        <Input value={loteOutroVinculo} onChange={e => setLoteOutroVinculo(e.target.value)} placeholder="Especifique" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <Button variant="ghost" onClick={() => setLoteStep('buscar')} className="text-sm">← Voltar</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                                disabled={!canGerar || gerandoLote}
                                onClick={handleGerarLote}>
                                {gerandoLote
                                    ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Gerando...</>
                                    : <><FiPrinter className="mr-2 h-4 w-4" />Gerar Lote ({selecionados.length})</>}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
