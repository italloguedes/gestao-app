"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import jsPDF from 'jspdf';

interface DashboardStats {
  total: number;
  correcoes: number;
  emAndamento: number;
  concluidos: number;
  bloqueados: number;
  hoje: number;
  agendamentosPendentes: number;
  agendamentosConfirmados: number;
  agendamentosCancelados: number;
}

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
}

interface AtendimentoEntrega extends Atendimento {
  nome_recebedor?: string;
  cpf_recebedor?: string;
  data_entrega?: string;
  usuario_entregador?: string;
  data_hora_entrega?: string;
  usuario_id?: string | number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    correcoes: 0,
    emAndamento: 0,
    concluidos: 0,
    bloqueados: 0,
    hoje: 0,
    agendamentosPendentes: 0,
    agendamentosConfirmados: 0,
    agendamentosCancelados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentAtendimentos, setRecentAtendimentos] = useState<Atendimento[]>([]);
  const [showEntregarCinModal, setShowEntregarCinModal] = useState(false);
  const [atendimentosParaEntrega, setAtendimentosParaEntrega] = useState<AtendimentoEntrega[]>([]);
  const [selectedAtendimento, setSelectedAtendimento] = useState<AtendimentoEntrega | null>(null);
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [cpfRecebedor, setCpfRecebedor] = useState('');
  const [loadingAtendimentosEntrega, setLoadingAtendimentosEntrega] = useState(false);
  const entregarCinButtonRef = useRef<HTMLButtonElement>(null);
  const [busca, setBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [gerandoComprovante, setGerandoComprovante] = useState(false);
  const [vinculo, setVinculo] = useState('');
  const [outroVinculo, setOutroVinculo] = useState('');
  const [nomeAtendente, setNomeAtendente] = useState('');
  const [emailAtendente, setEmailAtendente] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      fetchDashboardData();
    }
  }, [user, router]);

  useEffect(() => {
    if (showEntregarCinModal) {
      setAtendimentosParaEntrega([]);
      setBusca('');
      setBuscando(false);
    } else {
      setSelectedAtendimento(null);
      setNomeRecebedor('');
      setCpfRecebedor('');
    }
  }, [showEntregarCinModal]);

  useEffect(() => {
    if (selectedAtendimento && selectedAtendimento.usuario_id) {
      fetchNomeAtendente(selectedAtendimento.usuario_id);
    } else {
      setNomeAtendente('');
    }
  }, [selectedAtendimento]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch all atendimentos stats in parallel
      const [
        atendimentosData,
        agendamentosData,
        recentAtendimentosData
      ] = await Promise.all([
        // Atendimentos stats
        supabase.rpc('get_atendimentos_stats', { data_atual: today }),
        // Agendamentos stats
        supabase.rpc('get_agendamentos_stats'),
        // Recent atendimentos
        supabase
          .from('atendimentos')
          .select('*')
          .order('dia_atual', { ascending: false })
          .order('horario', { ascending: false })
          .limit(5)
      ]);

      if (atendimentosData.error) throw atendimentosData.error;
      if (agendamentosData.error) throw agendamentosData.error;
      if (recentAtendimentosData.error) throw recentAtendimentosData.error;

      const atendimentosStats = atendimentosData.data[0] || {};
      const agendamentosStats = agendamentosData.data[0] || {};

      setStats({
        total: atendimentosStats.total || 0,
        correcoes: atendimentosStats.correcoes || 0,
        emAndamento: atendimentosStats.em_andamento || 0,
        concluidos: atendimentosStats.concluidos || 0,
        bloqueados: atendimentosStats.bloqueados || 0,
        hoje: atendimentosStats.hoje || 0,
        agendamentosPendentes: agendamentosStats.pendentes || 0,
        agendamentosConfirmados: agendamentosStats.confirmados || 0,
        agendamentosCancelados: agendamentosStats.cancelados || 0,
      });

      setRecentAtendimentos(recentAtendimentosData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarAtendimentos = async () => {
    setBuscando(true);
    setLoadingAtendimentosEntrega(true);
    let query = supabase
      .from('atendimentos')
      .select('*')
      .neq('status', 'entregue');
    if (busca) {
      // Busca por nome ou CPF (case insensitive para nome)
      query = query.or(`nome.ilike.%${busca}%,cpf.eq.${busca}`);
    }
    const { data, error } = await query
      .order('dia_atual', { ascending: false })
      .order('horario', { ascending: false });
    if (!error) {
      setAtendimentosParaEntrega(data || []);
    }
    setLoadingAtendimentosEntrega(false);
    setBuscando(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + 'T12:00:00Z');
      return date.toLocaleDateString('pt-BR', {
        timeZone: 'America/Fortaleza',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'text-yellow-600 bg-yellow-50';
      case 'em_andamento':
        return 'text-blue-600 bg-blue-50';
      case 'concluido':
        return 'text-green-600 bg-green-50';
      case 'correcao':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleGerarComprovante = async () => {
    if (!selectedAtendimento || !nomeRecebedor || !cpfRecebedor || !user) return;
    const confirmed = window.confirm('Tem certeza que deseja confirmar a entrega da CIN? Esta ação é irreversível.');
    if (!confirmed) return;
    setGerandoComprovante(true);
    try {
      const now = new Date();
      const dataEntrega = now.toISOString().split('T')[0];
      const dataHoraEntrega = now.toISOString();
      // Atualizar atendimento no Supabase
      const { error } = await supabase
        .from('atendimentos')
        .update({
          nome_recebedor: nomeRecebedor,
          cpf_recebedor: cpfRecebedor,
          vinculo: vinculo === 'outros' ? outroVinculo : vinculo,
          data_entrega: dataEntrega,
          status: 'entregue',
          usuario_entregador: nomeAtendente || user.email || '',
          data_hora_entrega: dataHoraEntrega,
        })
        .eq('id', selectedAtendimento.id);
      if (error) throw error;

      // Carregar logo
      const logoUrl = '/logoautismo.png';
      const getBase64FromUrl = async (url: string) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };
      const logoBase64 = await getBase64FromUrl(logoUrl);

      // Gerar PDF moderno e profissional
      const doc = new jsPDF();
      // Logo centralizada
      doc.addImage(logoBase64, 'PNG', 80, 10, 50, 20);
      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text('PROTOCOLO DE ENTREGA DA CIN', 105, 42, { align: 'center' });
      // Linha decorativa
      doc.setDrawColor(16, 185, 129); // emerald-600
      doc.setLineWidth(1.2);
      doc.line(30, 48, 180, 48);
      // Caixa de dados principais
      let y = 58;
      doc.setFillColor(236, 253, 245); // verde claro (emerald-50)
      doc.roundedRect(18, y, 174, 60, 4, 4, 'F');
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      let yData = y + 10;
      const labelStyle = () => { doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129); };
      const valueStyle = () => { doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); };
      // Titular
      labelStyle(); doc.text('Titular:', 24, yData); valueStyle(); doc.text(selectedAtendimento.nome, 60, yData);
      yData += 8;
      labelStyle(); doc.text('CPF Titular:', 24, yData); valueStyle(); doc.text(selectedAtendimento.cpf, 60, yData);
      yData += 8;
      // Recebedor
      labelStyle(); doc.text('Recebedor:', 24, yData); valueStyle(); doc.text(nomeRecebedor, 60, yData);
      yData += 8;
      labelStyle(); doc.text('CPF Recebedor:', 24, yData); valueStyle(); doc.text(cpfRecebedor, 60, yData);
      yData += 8;
      labelStyle(); doc.text('Vínculo:', 24, yData); valueStyle(); doc.text(vinculo === 'outros' ? outroVinculo : vinculo, 60, yData);
      yData += 8;
      // Data e hora
      labelStyle(); doc.text('Data Entrega:', 24, yData); valueStyle(); doc.text(formatDate(dataEntrega), 60, yData);
      yData += 8;
      labelStyle(); doc.text('Hora Entrega:', 24, yData); valueStyle(); doc.text(now.toLocaleTimeString('pt-BR'), 60, yData);
      yData += 8;
      // Responsável
      labelStyle(); doc.text('Responsavel pelo atendimento:', 24, yData); valueStyle(); doc.text(emailAtendente, 90, yData);
      // Campo de assinatura destacado (agora no rodapé)
      const assinaturaY = 260;
      doc.setDrawColor(16, 185, 129); // emerald-600
      doc.setLineWidth(0.5);
      doc.roundedRect(18, assinaturaY - 10, 174, 28, 4, 4);
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text('Assinatura do Recebedor', 105, assinaturaY, { align: 'center' });
      doc.setTextColor(40, 40, 40);
      doc.text(`______________________________________`, 105, assinaturaY + 10, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Assinatura de ${nomeRecebedor}`, 105, assinaturaY + 16, { align: 'center' });
      // Rodapé fixo
      const rodapeY = 285;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(18, rodapeY - 7, 192, rodapeY - 7);
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Gerado por: ${nomeAtendente || user.email || ''}`, 20, rodapeY);
      doc.text(`Data/Hora: ${formatDate(dataEntrega)} ${now.toLocaleTimeString('pt-BR')}`, 150, rodapeY);
      // Gerar URL do PDF
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (err) {
      alert('Erro ao gerar comprovante.');
    }
    setGerandoComprovante(false);
  };

  const fetchNomeAtendente = async (usuarioId: string | number) => {
    const { data, error } = await supabase
      .from('users')
      .select('name, email')
      .eq('auth_id', usuarioId)
      .single();
    if (!error && data) {
      setNomeAtendente(data.name || '');
      setEmailAtendente(data.email || '');
    } else {
      setNomeAtendente('');
      setEmailAtendente('');
    }
  };

  if (loading) {
    return (
      <>
        <DashboardHeader />
        <div className="min-h-screen bg-gray-50 py-8 px-4 pt-20">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader />
      {/* Modal Entregar CIN */}
      {showEntregarCinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowEntregarCinModal(false)}
              aria-label="Fechar"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Entregar CIN</h2>
            {!selectedAtendimento ? (
              <div>
                <div className="mb-2 font-medium">Buscar atendimento por nome ou CPF:</div>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    className="block w-full border rounded px-3 py-2"
                    placeholder="Digite o nome ou CPF"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') buscarAtendimentos(); }}
                  />
                  <button
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    onClick={buscarAtendimentos}
                    disabled={!busca || buscando}
                  >
                    Buscar
                  </button>
                </div>
                {loadingAtendimentosEntrega ? (
                  <div className="text-gray-500">Carregando atendimentos...</div>
                ) : atendimentosParaEntrega.length === 0 && busca ? (
                  <div className="text-gray-500">Nenhum atendimento encontrado.</div>
                ) : atendimentosParaEntrega.length > 0 ? (
                  <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                    {atendimentosParaEntrega.map((a) => (
                      <li key={a.id} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{a.nome}</div>
                          <div className="text-xs text-gray-500">CPF: {a.cpf}</div>
                        </div>
                        <button
                          className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                          onClick={() => setSelectedAtendimento(a)}
                        >
                          Selecionar
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div>
                <div className="mb-2 font-medium">Dados do Atendimento</div>
                <div className="mb-2">
                  <div><span className="font-semibold">Nome:</span> {selectedAtendimento.nome}</div>
                  <div><span className="font-semibold">CPF:</span> {selectedAtendimento.cpf}</div>
                  <div><span className="font-semibold">Protocolo:</span> {selectedAtendimento.protocolo}</div>
                </div>
                <div className="mb-2 font-medium">Preencha os dados do recebedor:</div>
                <div className="mb-2">
                  <label className="block text-sm font-medium">Nome do Recebedor</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border rounded px-3 py-2"
                    value={nomeRecebedor}
                    onChange={e => setNomeRecebedor(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-sm font-medium">CPF do Recebedor</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border rounded px-3 py-2"
                    value={cpfRecebedor}
                    onChange={e => setCpfRecebedor(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-sm font-medium">Vínculo com o titular</label>
                  <select
                    className="mt-1 block w-full border rounded px-3 py-2"
                    value={vinculo}
                    onChange={e => setVinculo(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="mãe">Mãe</option>
                    <option value="pai">Pai</option>
                    <option value="irmão">Irmão</option>
                    <option value="tio">Tio</option>
                    <option value="avós">Avós</option>
                    <option value="outros">Outros</option>
                  </select>
                  {vinculo === 'outros' && (
                    <input
                      type="text"
                      className="mt-2 block w-full border rounded px-3 py-2"
                      placeholder="Digite o vínculo"
                      value={outroVinculo}
                      onChange={e => setOutroVinculo(e.target.value)}
                    />
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                    disabled={!nomeRecebedor || !cpfRecebedor || !vinculo || (vinculo === 'outros' && !outroVinculo) || gerandoComprovante}
                    onClick={handleGerarComprovante}
                  >
                    {gerandoComprovante ? 'Gerando...' : 'Gerar Comprovante'}
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    onClick={() => setSelectedAtendimento(null)}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal de visualização do PDF */}
      {pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setPdfUrl(null)}
              aria-label="Fechar"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Comprovante de Entrega</h2>
            <iframe src={pdfUrl} className="w-full h-[70vh] border rounded" title="Comprovante PDF"></iframe>
            <div className="mt-4 flex justify-end">
              <a href={pdfUrl} download="comprovante-entrega-cin.pdf" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Baixar PDF</a>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gray-50 py-8 px-4 pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Painel de Controle</h1>
              <p className="text-gray-600 mt-2">Bem-vindo ao gerenciamento de atendimentos.</p>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500">Total de Atendimentos</h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500">Correções</h3>
                <p className="mt-2 text-3xl font-bold text-red-600">{stats.correcoes}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500">Em Andamento</h3>
                <p className="mt-2 text-3xl font-bold text-blue-600">{stats.emAndamento}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500">Concluídos</h3>
                <p className="mt-2 text-3xl font-bold text-green-600">{stats.concluidos}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500">Bloqueados</h3>
                <p className="mt-2 text-3xl font-bold text-gray-700">{stats.bloqueados}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500">Hoje</h3>
                <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.hoje}</p>
              </div>
            </div>

            {/* Cards de Agendamentos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500">Agendamentos Pendentes</h3>
                <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.agendamentosPendentes}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500">Agendamentos Confirmados</h3>
                <p className="mt-2 text-3xl font-bold text-green-600">{stats.agendamentosConfirmados}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500">Agendamentos Cancelados</h3>
                <p className="mt-2 text-3xl font-bold text-red-600">{stats.agendamentosCancelados}</p>
              </div>
            </div>

            {/* Container para Ações Rápidas e Atendimentos Recentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ações Rápidas */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4 relative inline-block">
                  Ações Rápidas
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                </h2>
                <div className="flex flex-col space-y-3">
                  <Link 
                    href="/dashboard/atendimentos/novo" 
                    className="flex items-center px-4 py-3 rounded-lg border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="font-medium">Novo Atendimento</span>
                  </Link>

                  <Link 
                    href="/dashboard/atendimentos/atualizar-cin" 
                    className="flex items-center px-4 py-3 rounded-lg border-2 border-blue-500 text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="font-medium">Atualizar CIN</span>
                  </Link>

                  <Link 
                    href="/dashboard/atendimentos/correcoes" 
                    className="flex items-center px-4 py-3 rounded-lg border-2 border-red-500 text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">Ver Correções</span>
                  </Link>

                  <Link 
                    href="/dashboard/atendimentos/cancelados" 
                    className="flex items-center px-4 py-3 rounded-lg border-2 border-orange-500 text-orange-700 hover:bg-orange-50 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="font-medium">Atendimentos Cancelados</span>
                  </Link>

                  <Link 
                    href="/dashboard/atendimentos/bloqueados" 
                    className="flex items-center px-4 py-3 rounded-lg border-2 border-gray-500 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-medium">Atendimentos Bloqueados</span>
                  </Link>

                  <Link 
                    href="/admin/gestao" 
                    className="flex items-center px-4 py-3 rounded-lg border-2 border-purple-500 text-purple-700 hover:bg-purple-50 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Gestão de Agendamentos</span>
                  </Link>

                  <button
                    ref={entregarCinButtonRef}
                    onClick={() => setShowEntregarCinModal(true)}
                    className="flex items-center px-4 py-3 rounded-lg border-2 border-emerald-700 text-emerald-800 hover:bg-emerald-50 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m9 2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h7.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19z" />
                    </svg>
                    <span className="font-medium">Entregar CIN</span>
                  </button>
                </div>
              </div>

              {/* Atendimentos Recentes */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4 relative inline-block">
                  Atendimentos Recentes
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                </h2>
                <div className="space-y-3">
                  {recentAtendimentos.length === 0 ? (
                    <p className="text-gray-500">Nenhum atendimento registrado</p>
                  ) : (
                    recentAtendimentos.map((atendimento) => (
                      <div 
                        key={atendimento.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{atendimento.nome}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(atendimento.dia_atual)} - {atendimento.protocolo}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(atendimento.status)}`}>
                          {atendimento.status === 'correcao' ? 'Correção' : 
                           atendimento.status === 'concluido' ? 'Concluído' : 
                           atendimento.status === 'em_andamento' ? 'Em andamento' : 
                           atendimento.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/dashboard/atendimentos"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-primary text-white ring-4 ring-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Atendimentos
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Gerencie os atendimentos da Sala Sensorial
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/relatorios"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-primary text-white ring-4 ring-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Relatórios
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Acesse e gere relatórios detalhados
                  </p>
                </div>
              </Link>

              <Link
                href="/admin/gestao"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-primary text-white ring-4 ring-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Gestão de Agendamentos
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Gerencie os agendamentos e vagas
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function gerarCpfAleatorio() {
  // Gera um CPF válido (apenas para testes/demonstrativo)
  function randomInt(n: number) { return Math.floor(Math.random() * n); }
  let n = [];
  for (let i = 0; i < 9; ++i) n.push(randomInt(10));
  let d1 = 0, d2 = 0;
  for (let i = 0; i < 9; ++i) d1 += n[i] * (10 - i);
  d1 = 11 - (d1 % 11); if (d1 >= 10) d1 = 0;
  for (let i = 0; i < 9; ++i) d2 += n[i] * (11 - i);
  d2 += d1 * 2;
  d2 = 11 - (d2 % 11); if (d2 >= 10) d2 = 0;
  return `${n.join('')}${d1}${d2}`;
}
