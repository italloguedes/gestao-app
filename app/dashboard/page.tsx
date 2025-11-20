'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import NovoAtendimentoModal from './components/NovoAtendimentoModal';
import AtendimentoModal from '@/components/AtendimentoModal';
import SignaturePadCanvas from '@/components/SignaturePadCanvas';
import ModoEntregaModal from '@/components/ModoEntregaModal';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentAtendimentos from '@/components/dashboard/RecentAtendimentos';
import QuickAction from '@/components/dashboard/QuickAction';
import EntregarCinModal from '@/components/dashboard/EntregarCinModal';
import PdfModal from '@/components/dashboard/PdfModal';
import { generateComprovantePDF } from '@/lib/pdf-utils';
import { FiPlus, FiFingerprint, FiRefreshCw, FiAlertTriangle, FiXCircle, FiLock, FiCalendar, FiCheckCircle } from 'react-icons/fi';

type ModoEntrega = 'impressao' | 'digital';

interface DashboardStatsData {
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
  observacoes?: string;
}

interface AtendimentoEntrega extends Atendimento {
  nome_recebedor?: string;
  cpf_recebedor?: string;
  data_entrega?: string;
  data_hora_entrega?: string;
  usuario_id?: string | number;
  vinculo?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStatsData>({
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

  // Estados para entrega de CIN
  const [showEntregarCinModal, setShowEntregarCinModal] = useState(false);
  const [atendimentosParaEntrega, setAtendimentosParaEntrega] = useState<AtendimentoEntrega[]>([]);
  const [selectedAtendimento, setSelectedAtendimento] = useState<AtendimentoEntrega | null>(null);
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [cpfRecebedor, setCpfRecebedor] = useState('');
  const [loadingAtendimentosEntrega, setLoadingAtendimentosEntrega] = useState(false);
  const [busca, setBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [gerandoComprovante, setGerandoComprovante] = useState(false);
  const [vinculo, setVinculo] = useState('');
  const [outroVinculo, setOutroVinculo] = useState('');

  // Estados para sistema híbrido de assinatura
  const [showModoEntregaModal, setShowModoEntregaModal] = useState(false);
  const [modoEntregaSelecionado, setModoEntregaSelecionado] = useState<ModoEntrega | null>(null);
  const [showSignaturePadCanvas, setShowSignaturePadCanvas] = useState(false);
  const [assinaturaDataUrl, setAssinaturaDataUrl] = useState<string | null>(null);

  // Estados para o modal de edição de atendimento
  const [showEditAtendimentoModal, setShowEditAtendimentoModal] = useState(false);
  const [selectedAtendimentoForEdit, setSelectedAtendimentoForEdit] = useState<Atendimento | null>(null);

  // Estados para o modal de novo atendimento
  const [showNovoAtendimentoModal, setShowNovoAtendimentoModal] = useState(false);

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
      setVinculo('');
      setOutroVinculo('');
    }
  }, [showEntregarCinModal]);

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
        supabase.rpc('get_atendimentos_stats', { data_atual: today }),
        supabase.rpc('get_agendamentos_stats'),
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

    try {
      let query = supabase
        .from('atendimentos')
        .select('*')
        .neq('status', 'entregue');

      if (busca) {
        query = query.or(`nome.ilike.%${busca}%,cpf.eq.${busca}`);
      }

      const { data, error } = await query
        .order('dia_atual', { ascending: false })
        .order('horario', { ascending: false });

      if (error) throw error;

      setAtendimentosParaEntrega(data || []);

    } catch (error) {
      console.error('Erro ao buscar atendimentos:', error);
    } finally {
      setLoadingAtendimentosEntrega(false);
      setBuscando(false);
    }
  };

  const handleGerarComprovante = async () => {
    if (!selectedAtendimento || !nomeRecebedor || !cpfRecebedor || !user) {
      return;
    }
    setShowModoEntregaModal(true);
  };

  const handleSelectModoEntrega = (mode: ModoEntrega) => {
    setShowModoEntregaModal(false);
    setModoEntregaSelecionado(mode);

    if (mode === 'impressao') {
      handleProcessarEntrega(null);
    } else if (mode === 'digital') {
      setShowSignaturePadCanvas(true);
    }
  };

  const handleSaveSignatureCanvas = async (signatureDataUrl: string) => {
    setAssinaturaDataUrl(signatureDataUrl);
    setShowSignaturePadCanvas(false);
    await handleProcessarEntrega(signatureDataUrl);
  };

  const handleProcessarEntrega = async (signatureDataUrl: string | null) => {
    if (!selectedAtendimento || !nomeRecebedor || !cpfRecebedor || !user) return;

    setGerandoComprovante(true);
    try {
      // Buscar nome do atendente
      let atendenteNome = 'Não identificado';
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('auth_id', user.id)
        .single();

      if (!userError && userData?.name) {
        atendenteNome = userData.name;
      }

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
          data_hora_entrega: dataHoraEntrega,
          assinatura_base64: signatureDataUrl,
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

      // Gerar PDF
      const url = await generateComprovantePDF({
        atendimento: selectedAtendimento,
        recebedor: {
          nome: nomeRecebedor,
          cpf: cpfRecebedor,
          vinculo: vinculo === 'outros' ? outroVinculo : vinculo,
        },
        atendenteNome,
        dataEntrega,
        logoBase64,
        signatureDataUrl
      });

      setPdfUrl(url);
      fetchDashboardData(); // Atualizar dados do dashboard

    } catch (err) {
      console.error('Erro ao gerar comprovante:', err);
      alert('Erro ao gerar comprovante. Tente novamente.');
    } finally {
      setGerandoComprovante(false);
    }
  };

  if (loading) {
    return (
      <>
        <DashboardHeader />
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white py-6 px-3 pt-20">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-5">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
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

      <EntregarCinModal
        show={showEntregarCinModal}
        onClose={() => setShowEntregarCinModal(false)}
        atendimentos={atendimentosParaEntrega}
        onBuscar={buscarAtendimentos}
        busca={busca}
        setBusca={setBusca}
        buscando={buscando}
        loading={loadingAtendimentosEntrega}
        onSelect={setSelectedAtendimento}
        selected={selectedAtendimento}
        nomeRecebedor={nomeRecebedor}
        setNomeRecebedor={setNomeRecebedor}
        cpfRecebedor={cpfRecebedor}
        setCpfRecebedor={setCpfRecebedor}
        vinculo={vinculo}
        setVinculo={setVinculo}
        outroVinculo={outroVinculo}
        setOutroVinculo={setOutroVinculo}
        gerandoComprovante={gerandoComprovante}
        onGerarComprovante={handleGerarComprovante}
      />

      {pdfUrl && (
        <PdfModal url={pdfUrl} onClose={() => setPdfUrl(null)} />
      )}

      {showEditAtendimentoModal && selectedAtendimentoForEdit && (
        <AtendimentoModal
          atendimento={selectedAtendimentoForEdit}
          isOpen={showEditAtendimentoModal}
          onClose={() => {
            setShowEditAtendimentoModal(false);
            setSelectedAtendimentoForEdit(null);
          }}
          onUpdate={(updated) => {
            setRecentAtendimentos(prev =>
              prev.map(a => a.id === updated.id ? updated : a)
            );
            fetchDashboardData();
          }}
          onDelete={(id) => {
            setRecentAtendimentos(prev => prev.filter(a => a.id !== id));
            fetchDashboardData();
          }}
        />
      )}

      {showNovoAtendimentoModal && (
        <NovoAtendimentoModal
          show={showNovoAtendimentoModal}
          onClose={() => setShowNovoAtendimentoModal(false)}
          onSuccess={() => {
            setShowNovoAtendimentoModal(false);
            fetchDashboardData();
          }}
        />
      )}

      <ModoEntregaModal
        isOpen={showModoEntregaModal}
        onClose={() => setShowModoEntregaModal(false)}
        onSelectMode={handleSelectModoEntrega}
      />

      <SignaturePadCanvas
        isOpen={showSignaturePadCanvas}
        onClose={() => setShowSignaturePadCanvas(false)}
        onSave={handleSaveSignatureCanvas}
        title="Assinatura do Recebedor"
        recipientName={nomeRecebedor}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 py-8 px-4 pt-24">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Cabeçalho do Dashboard */}
          <div className="text-left space-y-3 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
              <div className="h-12 w-1.5 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Painel de Controle
                </h1>
                <p className="text-gray-500 mt-2 text-sm md:text-base font-medium flex items-center gap-2">
                  Bem-vindo ao gerenciamento de atendimentos
                </p>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <DashboardStats stats={stats} loading={loading} />

          {/* Container para Ações Rápidas e Atendimentos Recentes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Ações Rápidas */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg p-7 border-2 border-gray-100 hover:border-emerald-200 flex flex-col transition-all duration-300 hover:shadow-xl animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <FiCheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Ações Rápidas
                  </h2>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => setShowNovoAtendimentoModal(true)}
                  className="flex items-center px-4 py-3 rounded-xl shadow-sm border border-emerald-500 text-emerald-700 bg-white/80 backdrop-blur-sm hover:bg-gray-50 hover:shadow-md transition-all duration-300 group w-full"
                >
                  <div className="bg-emerald-100 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                    <FiPlus className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Novo Atendimento</span>
                </button>

                <QuickAction href="/dashboard/coleta-digitais" color="border-amber-500 text-amber-700 bg-amber-50/50" icon={<FiFingerprint className="h-5 w-5" />}>
                  Fila de Coleta de Digitais
                </QuickAction>

                <QuickAction href="/dashboard/atendimentos/atualizar-cin" color="border-blue-500 text-blue-700" icon={<FiRefreshCw className="h-5 w-5" />}>
                  Atualizar CIN
                </QuickAction>

                <QuickAction href="/dashboard/atendimentos/correcoes" color="border-red-500 text-red-700" icon={<FiAlertTriangle className="h-5 w-5" />}>
                  Ver Correções
                </QuickAction>

                <QuickAction href="/dashboard/atendimentos/cancelados" color="border-orange-500 text-orange-700" icon={<FiXCircle className="h-5 w-5" />}>
                  Atendimentos Cancelados
                </QuickAction>

                <QuickAction href="/dashboard/atendimentos/bloqueados" color="border-gray-500 text-gray-700" icon={<FiLock className="h-5 w-5" />}>
                  Atendimentos Bloqueados
                </QuickAction>

                <QuickAction href="/admin/gestao" color="border-purple-500 text-purple-700" icon={<FiCalendar className="h-5 w-5" />}>
                  Gestão de Agendamentos
                </QuickAction>

                <button
                  onClick={() => setShowEntregarCinModal(true)}
                  className="flex items-center px-4 py-3 rounded-xl shadow-sm border border-emerald-500 bg-white/80 backdrop-blur-sm hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 hover:shadow-md transition-all duration-300 group mt-2"
                >
                  <div className="bg-emerald-100 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                    <FiCheckCircle className="h-5 w-5 text-emerald-700" />
                  </div>
                  <span className="font-medium text-emerald-700">Entregar CIN</span>
                </button>
              </div>
            </div>

            {/* Atendimentos Recentes */}
            <RecentAtendimentos atendimentos={recentAtendimentos} loading={loading} />
          </div>
        </div>
      </div>
    </>
  );
}
