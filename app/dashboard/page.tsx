'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import AtendimentoModal from '@/components/AtendimentoModal';
import SignaturePadCanvas from '@/components/SignaturePadCanvas';
import ModoEntregaModal from '@/components/ModoEntregaModal';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentAtendimentos from '@/components/dashboard/RecentAtendimentos';
import QuickAction from '@/components/dashboard/QuickAction';
import EntregarCinModal from '@/components/dashboard/EntregarCinModal';
import PdfModal from '@/components/dashboard/PdfModal';
import { generateComprovantePDF, generateLotePDF } from '@/lib/pdf-utils';
import type { ItemLoteExport } from '@/components/dashboard/EntregarCinModal';
import { registrarHistorico } from '@/lib/historico-utils';
import {
  FiPlus, FiRefreshCw, FiAlertTriangle, FiCheckCircle,
  FiSearch, FiActivity, FiPackage
} from 'react-icons/fi';
import { MdFingerprint } from 'react-icons/md';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import TodayStats from './components/TodayStats';

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

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStatsData>({
    total: 0, correcoes: 0, emAndamento: 0, concluidos: 0,
    bloqueados: 0, hoje: 0, agendamentosPendentes: 0,
    agendamentosConfirmados: 0, agendamentosCancelados: 0,
  });

  const [todayStats, setTodayStats] = useState({
    total: 0, confirmados: 0, concluidos: 0, preferenciais: 0
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
  const [gerandoLote, setGerandoLote] = useState(false);
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
    if (!selectedAtendimento || !nomeRecebedor || !cpfRecebedor || !user) return;
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
      let atendenteNome = user.user_metadata?.name || user.user_metadata?.full_name || 'Não identificado';

      const now = new Date();
      const dataEntrega = now.toISOString().split('T')[0];
      const dataHoraEntrega = now.toISOString();

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

      // Registrar histórico de entrega individual
      await registrarHistorico({
        atendimento_id: selectedAtendimento.id,
        acao: 'entrega_cin',
        atendente_id: user.id,
        atendente_nome: atendenteNome,
        detalhes: {
          recebedor_nome: nomeRecebedor,
          recebedor_cpf: cpfRecebedor,
          vinculo: vinculo === 'outros' ? outroVinculo : vinculo,
        },
      });

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

      setShowEntregarCinModal(false);
      setSelectedAtendimento(null);
      setNomeRecebedor('');
      setCpfRecebedor('');
      setVinculo('');
      setOutroVinculo('');
      setPdfUrl(url);
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao gerar comprovante:', err);
      alert('Erro ao gerar comprovante. Tente novamente.');
    } finally {
      setGerandoComprovante(false);
    }
  };

  const handleGerarLote = async (items: ItemLoteExport[]) => {
    if (!user) return;
    setGerandoLote(true);
    try {
      const atendenteNome = user.user_metadata?.name || user.user_metadata?.full_name || 'Não identificado';
      const now = new Date();
      const dataEntrega = now.toISOString().split('T')[0];
      const dataHoraEntrega = now.toISOString();

      await Promise.all(items.map(({ atendimento, nomeRecebedor, cpfRecebedor, vinculo, outroVinculo }) =>
        supabase.from('atendimentos').update({
          nome_recebedor: nomeRecebedor,
          cpf_recebedor: cpfRecebedor,
          vinculo: vinculo === 'Outros' ? outroVinculo : vinculo,
          data_entrega: dataEntrega,
          status: 'entregue',
          data_hora_entrega: dataHoraEntrega,
        }).eq('id', atendimento.id)
      ));

      // Registrar histórico para cada item do lote
      await Promise.all(items.map(({ atendimento, nomeRecebedor, cpfRecebedor, vinculo, outroVinculo }) =>
        registrarHistorico({
          atendimento_id: atendimento.id,
          acao: 'entrega_cin',
          atendente_id: user.id,
          atendente_nome: atendenteNome,
          detalhes: {
            recebedor_nome: nomeRecebedor,
            recebedor_cpf: cpfRecebedor,
            vinculo: vinculo === 'Outros' ? outroVinculo : vinculo,
          },
        })
      ));

      const getBase64 = async (url: string) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };
      const logoBase64 = await getBase64('/logoautismo.png');

      const loteItems = items.map(({ atendimento, nomeRecebedor, cpfRecebedor, vinculo, outroVinculo }) => ({
        atendimento: { protocolo: atendimento.protocolo, nome: atendimento.nome, cpf: atendimento.cpf, dia_atual: atendimento.dia_atual },
        recebedor: { nome: nomeRecebedor, cpf: cpfRecebedor, vinculo: vinculo === 'Outros' ? outroVinculo : vinculo },
      }));

      const url = await generateLotePDF({ items: loteItems, atendenteNome, dataEntrega, logoBase64 });

      setShowEntregarCinModal(false);
      setSelectedAtendimento(null);
      setNomeRecebedor('');
      setCpfRecebedor('');
      setVinculo('');
      setOutroVinculo('');
      setPdfUrl(url);
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao gerar lote:', err);
      alert('Erro ao gerar comprovantes em lote. Tente novamente.');
    } finally {
      setGerandoLote(false);
    }
  };

  const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && globalSearch) {
      router.push(`/dashboard/atendimentos?search=${encodeURIComponent(globalSearch)}`);
    }
  };

  const handleEditAtendimento = (atendimento: Atendimento) => {
    setSelectedAtendimentoForEdit(atendimento);
    setShowEditAtendimentoModal(true);
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-500">
      {/* === Modals === */}
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
        gerandoLote={gerandoLote}
        onGerarLote={handleGerarLote}
      />

      {pdfUrl && <PdfModal url={pdfUrl} onClose={() => setPdfUrl(null)} />}

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

      {/* === Page Header === */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
              <FiActivity className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Dashboard</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Painel de Controle</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Bem-vindo, <span className="font-semibold text-emerald-600">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative group flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Buscar atendimento..."
              className="pl-9 h-10 bg-white border-gray-200 focus:border-emerald-400 focus:ring-emerald-100 rounded-lg text-sm"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={handleGlobalSearch}
            />
          </div>
          <Link
            href="/dashboard/atendimentos/novo"
            className="h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200/50 hover:-translate-y-0.5 transition-all duration-300 font-semibold px-5 text-sm flex items-center justify-center"
          >
            <FiPlus className="mr-1.5 h-4 w-4" />
            Novo Atendimento
          </Link>
        </div>
      </div>

      {/* === Today Stats Bar === */}
      <TodayStats
        total={todayStats.total}
        confirmados={todayStats.confirmados}
        concluidos={todayStats.concluidos}
        preferenciais={todayStats.preferenciais}
        loading={loading}
      />

      {/* === Stats Cards === */}
      <DashboardStats stats={stats} loading={loading} />

      {/* === 2-Column Grid: Quick Actions + Recent === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-6 items-start">

        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FiCheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Ações Rápidas</h2>
            </div>
            <div className="space-y-2">
              <QuickAction href="/dashboard/coleta-digitais" color="border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100" icon={<MdFingerprint className="h-4 w-4" />}>
                Fila de Coleta
              </QuickAction>

              <QuickAction href="/dashboard/atendimentos/atualizar-cin" color="border-teal-200 text-teal-800 bg-teal-50 hover:bg-teal-100" icon={<FiRefreshCw className="h-4 w-4" />}>
                Atualizar CIN
              </QuickAction>

              <QuickAction href="/dashboard/atendimentos/correcoes" color="border-red-200 text-red-800 bg-red-50 hover:bg-red-100" icon={<FiAlertTriangle className="h-4 w-4" />}>
                Ver Correções
              </QuickAction>

              <Button
                className="w-full justify-start h-auto py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition-all duration-300 group"
                variant="ghost"
                onClick={() => setShowEntregarCinModal(true)}
              >
                <div className="bg-emerald-200 p-1.5 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                  <FiCheckCircle className="h-4 w-4 text-emerald-800" />
                </div>
                <span className="font-bold text-xs">Entregar CIN</span>
              </Button>

              <QuickAction href="/dashboard/entrega-lote" color="border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100" icon={<FiPackage className="h-4 w-4" />}>
                Entrega em Lote
              </QuickAction>
            </div>

            {/* Mini Help */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-4 text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">Ajuda?</p>
                    <p className="text-emerald-100 text-[10px]">Consulte o manual.</p>
                  </div>
                  <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 h-8 w-8 p-0 rounded-lg shadow-none backdrop-blur-sm">
                    <FiSearch className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Atendimentos */}
        <div className="lg:col-span-2">
          <RecentAtendimentos
            atendimentos={recentAtendimentos}
            loading={loading}
            onEdit={handleEditAtendimento}
          />
        </div>
      </div>
    </div>
  );
}
