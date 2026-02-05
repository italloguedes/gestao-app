import React from 'react';
import { FiX, FiSearch, FiUser, FiCheck, FiAlertCircle, FiPrinter } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Atendimento {
    id: number;
    nome: string;
    cpf: string;
    email: string;
    solicitante: string;
    protocolo: string;
    dia_atual: string;
    horario: string;
    status: string;
    observacoes?: string;
    [key: string]: any;
}

interface EntregarCinModalProps {
    show: boolean;
    onClose: () => void;
    atendimentos: Atendimento[];
    onBuscar: () => void;
    busca: string;
    setBusca: (value: string) => void;
    buscando: boolean;
    loading: boolean;
    onSelect: (atendimento: Atendimento | null) => void;
    selected: Atendimento | null;
    nomeRecebedor: string;
    setNomeRecebedor: (value: string) => void;
    cpfRecebedor: string;
    setCpfRecebedor: (value: string) => void;
    vinculo: string;
    setVinculo: (value: string) => void;
    outroVinculo: string;
    setOutroVinculo: (value: string) => void;
    gerandoComprovante: boolean;
    onGerarComprovante: () => void;
}

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'concluido':
        case 'entregue':
            return 'bg-emerald-100 text-emerald-800';
        case 'em andamento':
        case 'em_andamento':
            return 'bg-blue-100 text-blue-800';
        case 'pendente':
            return 'bg-yellow-100 text-yellow-800';
        case 'correcao':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

export default function EntregarCinModal({
    show,
    onClose,
    atendimentos,
    onBuscar,
    busca,
    setBusca,
    buscando,
    loading,
    onSelect,
    selected,
    nomeRecebedor,
    setNomeRecebedor,
    cpfRecebedor,
    setCpfRecebedor,
    vinculo,
    setVinculo,
    outroVinculo,
    setOutroVinculo,
    gerandoComprovante,
    onGerarComprovante
}: EntregarCinModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative border border-emerald-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <button
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
                    onClick={onClose}
                    aria-label="Fechar"
                >
                    <FiX className="h-5 w-5" />
                </button>
                <div className="flex items-center mb-6">
                    <div className="bg-emerald-100 p-3 rounded-xl mr-4">
                        <FiCheck className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-700">Entregar CIN</h2>
                </div>

                {!selected ? (
                    <div>
                        <div className="mb-6 space-y-2">
                            <label htmlFor="busca" className="block text-sm font-medium text-gray-700">Buscar atendimento por nome ou CPF</label>
                            <div className="flex gap-2">
                                <Input
                                    id="busca"
                                    className="flex-1"
                                    placeholder="Digite o nome ou CPF"
                                    value={busca}
                                    onChange={e => setBusca(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') onBuscar(); }}
                                    autoFocus
                                />
                                <Button
                                    onClick={onBuscar}
                                    disabled={!busca || buscando}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {buscando ? (
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <FiSearch className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
                                    <p className="mt-3 text-sm text-gray-500">Buscando atendimentos...</p>
                                </div>
                            </div>
                        ) : atendimentos.length === 0 && busca ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <FiAlertCircle className="h-12 w-12 text-gray-300 mb-2" />
                                <p>Nenhum atendimento encontrado</p>
                                <p className="text-sm mt-1">Tente buscar com outro nome ou CPF</p>
                            </div>
                        ) : atendimentos.length > 0 ? (
                            <div>
                                <p className="text-sm text-gray-500 mb-3">Encontrados {atendimentos.length} atendimentos</p>
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {atendimentos.map((a) => (
                                        <div
                                            key={a.id}
                                            className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                                            onClick={() => onSelect(a)}
                                        >
                                            <div className="flex items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getStatusColor(a.status)}`}>
                                                    <FiUser className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{a.nome}</p>
                                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                                        <span className="font-mono">{a.cpf}</span> • {formatDate(a.dia_atual)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(a.status)}`}>
                                                    {a.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-800">Dados do Atendimento</h3>
                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Nome</p>
                                        <p className="font-medium text-gray-800">{selected.nome}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">CPF</p>
                                        <p className="font-medium text-gray-800">{selected.cpf}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Data</p>
                                        <p className="font-medium text-gray-800">{formatDate(selected.dia_atual)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Protocolo</p>
                                        <p className="font-medium text-gray-800">{selected.protocolo}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
                                <FiUser className="h-5 w-5 text-emerald-500 mr-2" />
                                Dados do Recebedor
                            </h3>
                            <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <Button
                                    variant="outline"
                                    className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                    onClick={() => {
                                        setNomeRecebedor(selected.nome);
                                        setCpfRecebedor(selected.cpf);
                                        setVinculo('próprio');
                                    }}
                                >
                                    Marcar como o mesmo (próprio titular)
                                </Button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="nomeRecebedor" className="text-sm font-medium text-gray-700">Nome do Recebedor</label>
                                        <Input
                                            id="nomeRecebedor"
                                            value={nomeRecebedor}
                                            onChange={(e) => setNomeRecebedor(e.target.value)}
                                            placeholder="Nome completo"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="cpfRecebedor" className="text-sm font-medium text-gray-700">CPF do Recebedor</label>
                                        <Input
                                            id="cpfRecebedor"
                                            value={cpfRecebedor}
                                            onChange={(e) => setCpfRecebedor(e.target.value)}
                                            placeholder="000.000.000-00"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="vinculo" className="text-sm font-medium text-gray-700">Vínculo com o titular</label>
                                    <select
                                        id="vinculo"
                                        value={vinculo}
                                        onChange={(e) => setVinculo(e.target.value)}
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    >
                                        <option value="">Selecione</option>
                                        <option value="Próprio">Próprio (titular)</option>
                                        <option value="Mãe">Mãe</option>
                                        <option value="Pai">Pai</option>
                                        <option value="Irmã(o)">Irmã(o)</option>
                                        <option value="Filho(a)">Filho(a)</option>
                                        <option value="Tio(a)">Tio(a)</option>
                                        <option value="Avós">Avós</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>

                                {vinculo === 'outros' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label htmlFor="outroVinculo" className="text-sm font-medium text-gray-700">Especifique o Vínculo</label>
                                        <Input
                                            id="outroVinculo"
                                            value={outroVinculo}
                                            onChange={(e) => setOutroVinculo(e.target.value)}
                                            placeholder="Especifique o vínculo"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => onSelect(null)}
                            >
                                Voltar
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={!nomeRecebedor || !cpfRecebedor || !vinculo || (vinculo === 'outros' && !outroVinculo) || gerandoComprovante}
                                onClick={onGerarComprovante}
                            >
                                {gerandoComprovante ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Gerando...
                                    </>
                                ) : (
                                    <>
                                        <FiPrinter className="mr-2 h-4 w-4" />
                                        Gerar e Imprimir
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
