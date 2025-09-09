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
  observacoes?: string;
}

interface AtendimentoEntrega extends Atendimento {
  nome_recebedor?: string;
  cpf_recebedor?: string;
  data_entrega?: string;
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
  // Removidas variáveis de estado do atendente

  // Estados para o modal de edição de atendimento
  const [showEditAtendimentoModal, setShowEditAtendimentoModal] = useState(false);
  const [selectedAtendimentoForEdit, setSelectedAtendimentoForEdit] = useState<Atendimento | null>(null);
  const [editingAtendimento, setEditingAtendimento] = useState<Partial<Atendimento>>({});
  const [savingAtendimento, setSavingAtendimento] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

  // Removido useEffect para buscar nome do atendente

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

    try {
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

      if (error) {
        throw error;
      }

      setAtendimentosParaEntrega(data || []);

    } catch (error) {
      console.error('Erro ao buscar atendimentos:', error);
    } finally {
      setLoadingAtendimentosEntrega(false);
      setBuscando(false);
    }
  };

  // A função formatDate foi movida para o escopo global

  // A função getStatusColor foi movida para o escopo global

  const handleGerarComprovante = async () => {
    if (!selectedAtendimento || !nomeRecebedor || !cpfRecebedor || !user) {
      return;
    }

    // Substituir o confirm padrão por um toast com confirmação
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

      // Cabeçalho com fundo colorido
      doc.setFillColor(16, 185, 129); // emerald-600
      doc.rect(0, 0, 210, 35, 'F');

      // Logo centralizada com fundo branco circular
      doc.setFillColor(255, 255, 255);
      doc.circle(30, 18, 12, 'F');
      doc.addImage(logoBase64, 'PNG', 20, 8, 20, 20);

      // Título e subtítulo no cabeçalho
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('COMPROVANTE DE ENTREGA', 105, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Carteira de Identidade Nacional', 105, 28, { align: 'center' });

      // Número de protocolo destacado
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.roundedRect(18, 40, 174, 16, 3, 3, 'F');
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PROTOCOLO:', 24, 50);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedAtendimento.protocolo || 'N/A', 70, 50);

      // Data e hora da entrega
      doc.text('DATA/HORA:', 120, 50);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatDate(dataEntrega)} às ${now.toLocaleTimeString('pt-BR')}`, 165, 50, { align: 'center' });

      // Seção de dados do titular
      const secaoY = 65;
      doc.setFillColor(16, 185, 129); // emerald-600
      doc.setTextColor(255, 255, 255);
      doc.roundedRect(18, secaoY, 174, 10, 3, 3, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO TITULAR', 105, secaoY + 7, { align: 'center' });

      // Bloco de dados do titular
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.roundedRect(18, secaoY + 10, 174, 40, 3, 3, 'F');
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);

      // Estilo para labels e valores
      const labelStyle = () => { doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129); };
      const valueStyle = () => { doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); };

      // Dados do titular
      let yData = secaoY + 22;
      labelStyle(); doc.text('Nome:', 24, yData); valueStyle(); doc.text(selectedAtendimento.nome, 60, yData);
      yData += 10;
      labelStyle(); doc.text('CPF:', 24, yData); valueStyle(); doc.text(selectedAtendimento.cpf, 60, yData);
      yData += 10;
      labelStyle(); doc.text('Data do Atendimento:', 24, yData); valueStyle(); doc.text(formatDate(selectedAtendimento.dia_atual), 90, yData);

      // Seção de dados do recebedor
      const recebedorY = secaoY + 60;
      doc.setFillColor(16, 185, 129); // emerald-600
      doc.setTextColor(255, 255, 255);
      doc.roundedRect(18, recebedorY, 174, 10, 3, 3, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO RECEBEDOR', 105, recebedorY + 7, { align: 'center' });

      // Bloco de dados do recebedor
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.roundedRect(18, recebedorY + 10, 174, 50, 3, 3, 'F');
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);

      // Dados do recebedor
      yData = recebedorY + 22;
      labelStyle(); doc.text('Nome:', 24, yData); valueStyle(); doc.text(nomeRecebedor, 60, yData);
      yData += 10;
      labelStyle(); doc.text('CPF:', 24, yData); valueStyle(); doc.text(cpfRecebedor, 60, yData);
      yData += 10;
      labelStyle(); doc.text('Vínculo:', 24, yData); valueStyle(); doc.text(vinculo === 'outros' ? outroVinculo : vinculo, 60, yData);

      // Informações adicionais
      const infoY = recebedorY + 70;
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.roundedRect(18, infoY, 174, 30, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'italic');
      doc.text('Este documento comprova a entrega da Carteira de Identidade Nacional (CIN) ao recebedor', 105, infoY + 10, { align: 'center' });
      doc.text('identificado acima. A entrega foi registrada no sistema com data e hora especificadas.', 105, infoY + 18, { align: 'center' });
      doc.text('Em caso de dúvidas, entre em contato com a Sala Sensorial da ALECE.', 105, infoY + 26, { align: 'center' });

      // Campo de assinatura destacado
      const assinaturaY = 240;
      doc.setDrawColor(16, 185, 129); // emerald-600
      doc.setLineWidth(0.5);
      doc.roundedRect(18, assinaturaY, 174, 35, 3, 3);
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.setFont('helvetica', 'bold');
      doc.text('ASSINATURA DO RECEBEDOR', 105, assinaturaY + 10, { align: 'center' });
      doc.setTextColor(40, 40, 40);
      doc.setLineWidth(0.3);
      doc.line(45, assinaturaY + 20, 165, assinaturaY + 20);
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(`${nomeRecebedor} - CPF: ${cpfRecebedor}`, 100, assinaturaY + 25, { align: 'center' });

      // Removido QR Code
      // Rodapé moderno com fundo colorido
      const rodapeY = 285;
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.rect(0, rodapeY - 15, 210, 20, 'F');

      // Linha decorativa superior do rodapé
      doc.setDrawColor(16, 185, 129); // emerald-600
      doc.setLineWidth(0.5);
      doc.line(0, rodapeY - 15, 210, rodapeY - 15);

      // Informações do rodapé
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text('SALA SENSORIAL / ALECE', 105, rodapeY - 10, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Emitido em: ${formatDate(dataEntrega)} às ${now.toLocaleTimeString('pt-BR')}`, 105, rodapeY - 3, { align: 'center' });

      // Número da página
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('Página 1/1', 105, rodapeY + 3, { align: 'center' });
      // Gerar URL do PDF
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);


    } catch (err) {
      console.error('Erro ao gerar comprovante:', err);
    }
    setGerandoComprovante(false);
  };

  // Removida função fetchNomeAtendente

  // Funções para edição de atendimento
  const validateCPF = (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return 'CPF deve ter 11 dígitos';
    return null;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'E-mail inválido';
    return null;
  };

  const handleEditAtendimento = (atendimento: Atendimento) => {
    setSelectedAtendimentoForEdit(atendimento);
    setEditingAtendimento(atendimento);
    setValidationErrors({});
    setShowEditAtendimentoModal(true);
  };

  const handleInputChange = (field: keyof Atendimento, value: string) => {
    setValidationErrors(prev => ({ ...prev, [field]: '' }));
    
    if (field === 'cpf') {
      const error = validateCPF(value);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [field]: error }));
      }
    }
    
    if (field === 'email') {
      const error = validateEmail(value);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [field]: error }));
      }
    }

    setEditingAtendimento(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAtendimento = async () => {
    if (!selectedAtendimentoForEdit || !editingAtendimento) return;

    // Validar campos obrigatórios
    const requiredFields: (keyof Atendimento)[] = ['nome', 'cpf', 'email', 'solicitante', 'protocolo', 'dia_atual', 'horario', 'status'];
    const newValidationErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      if (!editingAtendimento[field]) {
        newValidationErrors[field] = 'Este campo é obrigatório';
      }
    });

    if (Object.keys(newValidationErrors).length > 0) {
      setValidationErrors(newValidationErrors);
      return;
    }

    try {
      setSavingAtendimento(true);
      

      const { error } = await supabase
        .from('atendimentos')
        .update(editingAtendimento)
        .eq('id', selectedAtendimentoForEdit.id);

      if (error) throw error;
      
      // Atualizar a lista de atendimentos recentes
      setRecentAtendimentos(prev => 
        prev.map(a => 
          a.id === selectedAtendimentoForEdit.id 
            ? { ...a, ...editingAtendimento } 
            : a
        )
      );


      setShowEditAtendimentoModal(false);
      setSelectedAtendimentoForEdit(null);
      setEditingAtendimento({});
      setValidationErrors({});
    } catch (err: any) {
      console.error('Erro ao salvar atendimento:', err);
    } finally {
      setSavingAtendimento(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingAtendimento(selectedAtendimentoForEdit || {});
    setValidationErrors({});
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
                  <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
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
      )}
      {/* Modal de visualização do PDF */}
      {pdfUrl && (
        <PdfModal url={pdfUrl} onClose={() => setPdfUrl(null)} />
      )}
      {/* Modal de edição de atendimento */}
      {showEditAtendimentoModal && selectedAtendimentoForEdit && (
        <EditAtendimentoModal
          show={showEditAtendimentoModal}
          onClose={() => {
            setShowEditAtendimentoModal(false);
            setSelectedAtendimentoForEdit(null);
            setEditingAtendimento({});
            setValidationErrors({});
          }}
          atendimento={selectedAtendimentoForEdit}
          editingAtendimento={editingAtendimento}
          onInputChange={handleInputChange}
          onSave={handleSaveAtendimento}
          onCancel={handleCancelEdit}
          saving={savingAtendimento}
          validationErrors={validationErrors}
        />
      )}
      <div className="min-h-screen bg-gray-50 py-8 px-4 pt-20">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-700 tracking-tight">Painel de Controle</h1>
            <p className="text-gray-500 mt-2 text-base md:text-lg">Bem-vindo ao gerenciamento de atendimentos.</p>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            <StatCard title="Total de Atendimentos" value={stats.total} color="text-gray-900" />
            <StatCard title="Correções" value={stats.correcoes} color="text-red-600" />
            <StatCard title="Em Andamento" value={stats.emAndamento} color="text-blue-600" />
            <StatCard title="Concluídos" value={stats.concluidos} color="text-green-600" />
            <StatCard title="Bloqueados" value={stats.bloqueados} color="text-gray-700" />
            <StatCard title="Hoje" value={stats.hoje} color="text-emerald-600" />
          </div>

          {/* Container para Ações Rápidas e Atendimentos Recentes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ações Rápidas */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold relative inline-block text-emerald-700">
                  Ações Rápidas
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                </h2>
                <div className="flex space-x-2">
                  <button className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <QuickAction href="/dashboard/atendimentos/novo" color="border-emerald-500 text-emerald-700" icon={
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }>
                  Novo Atendimento
                </QuickAction>
                <QuickAction href="/dashboard/atendimentos/atualizar-cin" color="border-blue-500 text-blue-700" icon={
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }>
                  Atualizar CIN
                </QuickAction>
                <QuickAction href="/dashboard/atendimentos/correcoes" color="border-red-500 text-red-700" icon={
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }>
                  Ver Correções
                </QuickAction>
                <QuickAction href="/dashboard/atendimentos/cancelados" color="border-orange-500 text-orange-700" icon={
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }>
                  Atendimentos Cancelados
                </QuickAction>
                <QuickAction href="/dashboard/atendimentos/bloqueados" color="border-gray-500 text-gray-700" icon={
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }>
                  Atendimentos Bloqueados
                </QuickAction>
                <QuickAction href="/admin/gestao" color="border-purple-500 text-purple-700" icon={
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }>
                  Gestão de Agendamentos
                </QuickAction>
                <button
                  ref={entregarCinButtonRef}
                  onClick={() => setShowEntregarCinModal(true)}
                  className="flex items-center px-4 py-3 rounded-xl shadow-sm border border-emerald-500 hover:shadow-md transition-all duration-300 group mt-2"
                >
                  <div className="bg-emerald-100 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m9 2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h7.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19z" />
                    </svg>
                  </div>
                  <span className="font-medium text-emerald-700">Entregar CIN</span>
                  <svg className="h-5 w-5 ml-auto text-gray-400 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Atendimentos Recentes */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold relative inline-block text-emerald-700">
                  Atendimentos Recentes
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                </h2>
                <Link href="/dashboard/atendimentos" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                  Ver todos
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="space-y-4">
                {recentAtendimentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <svg className="h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Nenhum atendimento registrado</p>
                  </div>
                ) : (
                  recentAtendimentos.map((atendimento) => (
                    <div
                      key={atendimento.id}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
                    >
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getStatusColor(atendimento.status).replace('text-', 'bg-')}`}>
                          {atendimento.status === 'correcao' ? (
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          ) : atendimento.status === 'concluido' ? (
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : atendimento.status === 'em_andamento' ? (
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{atendimento.nome}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(atendimento.dia_atual)} - {atendimento.protocolo}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`status-badge ${atendimento.status === 'correcao' ? 'status-error' :
                          atendimento.status === 'concluido' ? 'status-completed' :
                            atendimento.status === 'em_andamento' ? 'status-in-progress' :
                              'status-pending'}`}>
                          {atendimento.status === 'correcao' ? 'Correção' :
                            atendimento.status === 'concluido' ? 'Concluído' :
                              atendimento.status === 'em_andamento' ? 'Em andamento' :
                                atendimento.status}
                        </span>
                        {/* Botão de navegação */}
                        <button
                          className="ml-3 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => router.push(`/dashboard/atendimentos/${atendimento.id}/AtendimentoDetalhes`)}
                        ></button>
                        <button 
                          className="ml-3 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => handleEditAtendimento(atendimento)}
                          title="Editar atendimento"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


        </div>
      </div>
    </>
  );
}

// Funções de utilidade (movidas para fora do componente para serem acessíveis globalmente)
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

const formatTime = (timeString: string) => {
  return timeString.substring(0, 5);
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

// 1. COMPONENTES INTERNOS

// Modal de Entrega da CIN
function EntregarCinModal({
  show, onClose, atendimentos, onBuscar, busca, setBusca, buscando, loading, onSelect, selected, nomeRecebedor, setNomeRecebedor, cpfRecebedor, setCpfRecebedor, vinculo, setVinculo, outroVinculo, setOutroVinculo, gerandoComprovante, onGerarComprovante
}: any) {
  return show ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative border border-emerald-100">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center mb-6">
          <div className="bg-emerald-100 p-3 rounded-xl mr-4">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m9 2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h7.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-emerald-700">Entregar CIN</h2>
        </div>
        {!selected ? (
          <div>
            <div className="mb-6">
              <label htmlFor="busca" className="block text-sm font-medium text-gray-700 mb-2">Buscar atendimento por nome ou CPF</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="busca"
                  className="block w-full border rounded-xl pl-10 pr-16 py-3 focus:ring-2 focus:ring-emerald-400"
                  placeholder="Digite o nome ou CPF"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') onBuscar(); }}
                  autoFocus
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <button
                    onClick={onBuscar}
                    disabled={!busca || buscando}
                    className="h-full px-4 bg-emerald-600 text-white rounded-r-xl hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {buscando ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Buscando
                      </>
                    ) : 'Buscar'}
                  </button>
                </div>
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
                <svg className="h-16 w-16 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Nenhum atendimento encontrado</p>
                <p className="text-sm mt-1">Tente buscar com outro nome ou CPF</p>
              </div>
            ) : atendimentos.length > 0 ? (
              <div>
                <p className="text-sm text-gray-500 mb-3">Encontrados {atendimentos.length} atendimentos</p>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {atendimentos.map((a: any) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                      onClick={() => onSelect(a)}
                    >
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getStatusColor(a.status).replace('text-', 'bg-')}`}>
                          {a.status === 'correcao' ? (
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          ) : a.status === 'concluido' ? (
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : a.status === 'em_andamento' ? (
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{a.nome}</p>
                          <p className="text-sm text-gray-500">
                            CPF: {a.cpf} | {formatDate(a.dia_atual)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`status-badge ${a.status === 'correcao' ? 'status-error' :
                          a.status === 'concluido' ? 'status-completed' :
                            a.status === 'em_andamento' ? 'status-in-progress' :
                              'status-pending'}`}>
                          {a.status === 'correcao' ? 'Correção' :
                            a.status === 'concluido' ? 'Concluído' :
                              a.status === 'em_andamento' ? 'Em andamento' :
                                a.status}
                        </span>
                        <svg className="h-5 w-5 ml-3 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div>
            <div className="mb-6">
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

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
                <svg className="h-5 w-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Dados do Recebedor
              </h3>
              <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNomeRecebedor(selected.nome);
                      setCpfRecebedor(selected.cpf);
                      setVinculo('próprio');
                    }}
                    className="w-full py-2 px-4 bg-emerald-100 text-emerald-700 font-medium rounded-lg hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Marcar como o mesmo (próprio titular)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="nomeRecebedor" className="block text-sm font-medium text-gray-700 mb-1">Nome do Recebedor</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="nomeRecebedor"
                        value={nomeRecebedor}
                        onChange={(e) => setNomeRecebedor(e.target.value)}
                        className="block w-full border rounded-xl pl-10 pr-3 py-3 focus:ring-2 focus:ring-emerald-400"
                        placeholder="Nome completo"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cpfRecebedor" className="block text-sm font-medium text-gray-700 mb-1">CPF do Recebedor</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="cpfRecebedor"
                        value={cpfRecebedor}
                        onChange={(e) => setCpfRecebedor(e.target.value)}
                        className="block w-full border rounded-xl pl-10 pr-3 py-3 focus:ring-2 focus:ring-emerald-400"
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="vinculo" className="block text-sm font-medium text-gray-700 mb-1">Vínculo com o titular</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <select
                      id="vinculo"
                      value={vinculo}
                      onChange={(e) => setVinculo(e.target.value)}
                      className="block w-full border rounded-xl pl-10 pr-3 py-3 focus:ring-2 focus:ring-emerald-400 appearance-none bg-white"
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
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {vinculo === 'outros' && (
                  <div className="animate-fade-in">
                    <label htmlFor="outroVinculo" className="block text-sm font-medium text-gray-700 mb-1">Especifique o Vínculo</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="outroVinculo"
                        value={outroVinculo}
                        onChange={(e) => setOutroVinculo(e.target.value)}
                        className="block w-full border rounded-xl pl-10 pr-3 py-3 focus:ring-2 focus:ring-emerald-400"
                        placeholder="Especifique o vínculo"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                className="px-4 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors flex items-center gap-2"
                onClick={() => onSelect(null)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
              </button>
              <button
                className="px-4 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                disabled={!nomeRecebedor || !cpfRecebedor || !vinculo || (vinculo === 'outros' && !outroVinculo) || gerandoComprovante}
                onClick={onGerarComprovante}
              >
                {gerandoComprovante ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Gerar Comprovante
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;
}

// Modal de PDF
function PdfModal({ url, onClose }: { url: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative border border-gray-100">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center mb-6">
          <div className="bg-emerald-100 p-3 rounded-xl mr-4 shadow-sm">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Comprovante de Entrega</h2>
            <p className="text-sm text-gray-500">Visualize e baixe o comprovante em PDF</p>
          </div>
        </div>
        <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Carregando PDF...</p>
            </div>
          </div>
          <iframe src={url} className="w-full h-[70vh] relative z-10" title="Comprovante PDF"></iframe>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500 flex items-center">
            <svg className="h-5 w-5 mr-1 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            O PDF foi gerado automaticamente
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Fechar
            </button>
            <a
              href={url}
              download="comprovante-entrega-cin.pdf"
              className="btn-primary flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Baixar PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Card de estatística
function StatCard({ title, value, color }: { title: string, value: any, color: string }) {
  return (
    <div className="dashboard-card group overflow-hidden relative">
      <div className={`absolute top-0 left-0 w-1 h-full ${color.replace('text-', 'bg-')}`}></div>
      <div className="pl-3">
        <h3 className="dashboard-card-title text-gray-700">{title}</h3>
        <p className={`dashboard-card-value ${color}`}>{value}</p>
        <div className="dashboard-card-subtitle">Atendimentos</div>
      </div>
      <div className={`absolute bottom-0 left-0 w-full h-1 ${color.replace('text-', 'bg-')} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
    </div>
  );
}

// Card de ação rápida
function QuickAction({ href, color, icon, children }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center px-4 py-3 rounded-xl shadow-sm border ${color.replace('text-', 'border-').replace('border-', 'border-')} hover:shadow-md transition-all duration-300 group`}
    >
      <div className={`${color.replace('text-', 'bg-').replace('-700', '-100')} p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <span className="font-medium">{children}</span>
      <svg className="h-5 w-5 ml-auto text-gray-400 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
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

// Modal de edição de atendimento
function EditAtendimentoModal({
  show,
  onClose,
  atendimento,
  editingAtendimento,
  onInputChange,
  onSave,
  onCancel,
  saving,
  validationErrors
}: {
  show: boolean;
  onClose: () => void;
  atendimento: Atendimento;
  editingAtendimento: Partial<Atendimento>;
  onInputChange: (field: keyof Atendimento, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  validationErrors: Record<string, string>;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative border border-emerald-100 max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center mb-6">
          <div className="bg-emerald-100 p-3 rounded-xl mr-4">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-700">Editar Atendimento</h2>
            <p className="text-sm text-gray-500">Protocolo: {atendimento.protocolo}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações do Atendimento */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="h-5 w-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Dados do Atendimento
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={editingAtendimento.nome || ''}
                  onChange={(e) => onInputChange('nome', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.nome ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Nome completo"
                />
                {validationErrors.nome && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.nome}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF *
                </label>
                <input
                  type="text"
                  value={editingAtendimento.cpf || ''}
                  onChange={(e) => onInputChange('cpf', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.cpf ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="000.000.000-00"
                />
                {validationErrors.cpf && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.cpf}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={editingAtendimento.email || ''}
                  onChange={(e) => onInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="email@exemplo.com"
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solicitante *
                </label>
                <input
                  type="text"
                  value={editingAtendimento.solicitante || ''}
                  onChange={(e) => onInputChange('solicitante', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.solicitante ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Nome do solicitante"
                />
                {validationErrors.solicitante && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.solicitante}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Atendimento *
                </label>
                <input
                  type="date"
                  value={editingAtendimento.dia_atual || ''}
                  onChange={(e) => onInputChange('dia_atual', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.dia_atual ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {validationErrors.dia_atual && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.dia_atual}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário *
                </label>
                <input
                  type="time"
                  value={editingAtendimento.horario || ''}
                  onChange={(e) => onInputChange('horario', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.horario ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {validationErrors.horario && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.horario}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  value={editingAtendimento.status || ''}
                  onChange={(e) => onInputChange('status', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.status ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione o status</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="correcao">Correção</option>
                  <option value="bloqueado">Bloqueado</option>
                  <option value="entregue">Entregue</option>
                </select>
                {validationErrors.status && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.status}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Protocolo *
                </label>
                <input
                  type="text"
                  value={editingAtendimento.protocolo || ''}
                  onChange={(e) => onInputChange('protocolo', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    validationErrors.protocolo ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Número do protocolo"
                />
                {validationErrors.protocolo && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.protocolo}</p>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="h-5 w-5 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Observações
            </h3>
                           <textarea
                 value={(editingAtendimento as any).observacoes || ''}
                 onChange={(e) => onInputChange('observacoes' as keyof Atendimento, e.target.value)}
                 rows={3}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                 placeholder="Observações sobre o atendimento..."
               />
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
            disabled={saving}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
