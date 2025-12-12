'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
// DashboardHeader import removed (handled by layout)
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
import { FiPlus, FiRefreshCw, FiAlertTriangle, FiXCircle, FiLock, FiCalendar, FiCheckCircle, FiSearch, FiBell, FiSettings } from 'react-icons/fi';
import { MdFingerprint } from 'react-icons/md';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  [key: string]: any;
}

interface AtendimentoEntrega extends Atendimento {
  nome_recebedor?: string;
  cpf_recebedor?: string;
  data_entrega?: string;
  data_hora_entrega?: string;
  usuario_id?: string | number;
  vinculo?: string;
}

import TodayStats from './components/TodayStats';

// ... existing imports

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

  const [todayStats, setTodayStats] = useState({
    total: 0,
    confirmados: 0,
    concluidos: 0,
    preferenciais: 0
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

  // Estado para busca global
  const [globalSearch, setGlobalSearch] = useState('');

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
        recentAtendimentosData,
        todayAgendamentosData
      ] = await Promise.all([
        supabase.rpc('get_atendimentos_stats', { data_atual: today }),
        supabase.rpc('get_agendamentos_stats'),
        supabase
          .from('atendimentos')
          .select('*')
          .order('dia_atual', { ascending: false })
          .order('horario', { ascending: false })
          .limit(5),
        supabase
          .from('agendamentos')
          .select('status, atendimento_preferencial')
          .eq('data', today)
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

      // Calculate today's stats from agendamentos
      const todayAppointments = todayAgendamentosData.data || [];
      setTodayStats({
        total: todayAppointments.length,
        confirmados: todayAppointments.filter((a: any) => a.status === 'confirmado' || a.status === 'agendado').length,
        concluidos: todayAppointments.filter((a: any) => a.status === 'concluido' || a.status === 'realizado').length,
        preferenciais: todayAppointments.filter((a: any) => a.atendimento_preferencial).length
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

  const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && globalSearch) {
      // Redirect to atendimentos page with search query
      router.push(`/dashboard/atendimentos?search=${encodeURIComponent(globalSearch)}`);
    }
  };

  const handleEditAtendimento = (atendimento: Atendimento) => {
    setSelectedAtendimentoForEdit(atendimento);
    setShowEditAtendimentoModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Modals */}
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

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-gray-200/50">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">Painel de Controle</h1>
          <p className="mt-2 text-lg text-gray-600 font-medium">
            Bem-vindo de volta, <span className="text-emerald-600">{user?.email?.split('@')[0]}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group flex-1 sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Buscar atendimento..."
              className="pl-10 h-12 bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={handleGlobalSearch}
            />
          </div>
          <Button
            className="h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold px-6"
            onClick={() => setShowNovoAtendimentoModal(true)}
          >
            <FiPlus className="mr-2 h-5 w-5" />
            Novo Atendimento
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="space-y-6">
        <TodayStats
          total={todayStats.total}
          confirmados={todayStats.confirmados}
          concluidos={todayStats.concluidos}
          preferenciais={todayStats.preferenciais}
          loading={loading}
        />
        <DashboardStats stats={stats} loading={loading} />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          <RecentAtendimentos
            atendimentos={recentAtendimentos}
            loading={loading}
            onEdit={handleEditAtendimento}
          />
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100 p-8 hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                <FiCheckCircle className="h-6 w-6" />
              </div>
              Ações Rápidas
            </h2>
            <div className="space-y-4">
              <QuickAction href="/dashboard/coleta-digitais" color="border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100" icon={<MdFingerprint className="h-6 w-6" />}>
                Fila de Coleta
              </QuickAction>

              <QuickAction href="/dashboard/atendimentos/atualizar-cin" color="border-blue-200 text-blue-800 bg-blue-50 hover:bg-blue-100" icon={<FiRefreshCw className="h-6 w-6" />}>
                Atualizar CIN
              </QuickAction>

              <QuickAction href="/dashboard/atendimentos/correcoes" color="border-red-200 text-red-800 bg-red-50 hover:bg-red-100" icon={<FiAlertTriangle className="h-6 w-6" />}>
                Ver Correções
              </QuickAction>

              <Button
                className="w-full justify-start h-auto py-4 px-6 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl transition-all duration-300 group"
                variant="ghost"
                onClick={() => setShowEntregarCinModal(true)}
              >
                <div className="bg-emerald-200 p-2 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                  <FiCheckCircle className="h-6 w-6 text-emerald-800" />
                </div>
                <span className="font-bold text-lg">Entregar CIN</span>
              </Button>
            </div>
          </div>

          {/* Help Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[2rem] shadow-xl p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-3">Precisa de ajuda?</h3>
              <p className="text-emerald-100 mb-6 leading-relaxed">Confira o manual completo do sistema ou entre em contato com nossa equipe de suporte.</p>
              <Button variant="secondary" className="bg-white text-emerald-700 hover:bg-emerald-50 border-none w-full h-12 rounded-xl font-bold shadow-lg">
                Ver Documentação
              </Button>
            </div>
            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-500"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-emerald-400 opacity-20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity duration-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
