'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Agendamento {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  data: string;
  horario: string;
  status: string;
  posto?: string;
}

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'bloqueado', label: 'Bloqueado' },
];

const POSTOS = [
  { id: '', nome: 'Todos os Postos' },
  { id: 'Sala Sensorial', nome: 'Sala Sensorial' },
  { id: 'Alece Itinerante I', nome: 'Alece Itinerante I' },
  { id: 'Alece Itinerante II', nome: 'Alece Itinerante II' },
];

export default function RelatorioAgendamentosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState('');
  const [posto, setPosto] = useState('');
  const [ordenacao, setOrdenacao] = useState<'padrao' | 'nome'>('padrao');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Pre-load logo as base64
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/alece_logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
      }
    };
    loadLogo();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '—';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '—';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const generatePDF = async (data: Agendamento[]) => {
    let atendenteNome = 'Não identificado';
    if (user) {
      atendenteNome = user.user_metadata?.name || user.user_metadata?.full_name || 'Não identificado';
    }

    const doc = new jsPDF();
    const primaryColor = [0, 135, 81] as [number, number, number];
    const secondaryColor = [248, 249, 250] as [number, number, number];
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- CABEÇALHO PÁGINA 1 COM LOGO ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Logo à esquerda
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 12, 3, 36, 36);
      } catch (e) {
        console.error('Erro ao adicionar logo ao PDF:', e);
      }
    }

    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const title = 'RELATÓRIO DE AGENDAMENTOS';
    const titleWidth = doc.getStringUnitWidth(title) * 16 / doc.internal.scaleFactor;
    const titleX = logoBase64 ? 52 + (pageWidth - 52 - titleWidth) / 2 : (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, 16);

    // Subtítulo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const subtitle = 'Assembleia Legislativa do Estado do Ceará';
    const subtitleWidth = doc.getStringUnitWidth(subtitle) * 10 / doc.internal.scaleFactor;
    const subtitleX = logoBase64 ? 52 + (pageWidth - 52 - subtitleWidth) / 2 : (pageWidth - subtitleWidth) / 2;
    doc.text(subtitle, subtitleX, 24);

    // Período e Total
    doc.setFontSize(9);
    const periodoText = dataInicio && dataFim && dataInicio !== dataFim
      ? `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`
      : `Data: ${formatDate(dataInicio || dataFim)}`;
    const totalText = `Total: ${data.length} ${data.length === 1 ? 'agendamento' : 'agendamentos'}`;
    const infoText = `${periodoText}  |  ${totalText}`;
    const infoWidth = doc.getStringUnitWidth(infoText) * 9 / doc.internal.scaleFactor;
    const infoX = logoBase64 ? 52 + (pageWidth - 52 - infoWidth) / 2 : (pageWidth - infoWidth) / 2;
    doc.text(infoText, infoX, 32);

    // Posto (se filtrado)
    if (posto) {
      doc.setFontSize(8);
      const postoText = `Posto: ${posto}`;
      const postoWidth = doc.getStringUnitWidth(postoText) * 8 / doc.internal.scaleFactor;
      const postoX = logoBase64 ? 52 + (pageWidth - 52 - postoWidth) / 2 : (pageWidth - postoWidth) / 2;
      doc.text(postoText, postoX, 38);
    }

    // --- TABELA ---
    const tableColumn = ['Nome', 'CPF', 'Telefone', 'Status'];
    const tableRows = data.map(ag => [
      ag.nome.length > 40 ? ag.nome.substring(0, 37) + '...' : ag.nome,
      formatCPF(ag.cpf),
      formatPhone(ag.telefone),
      ag.status.charAt(0).toUpperCase() + ag.status.slice(1).toLowerCase()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 48,
      styles: {
        fontSize: 8,
        cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
        lineColor: [230, 230, 230],
        lineWidth: 0.1,
        textColor: [50, 50, 50],
        overflow: 'ellipsize',
        minCellHeight: 8,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },    // Nome
        1: { cellWidth: 35, halign: 'center' },       // CPF
        2: { cellWidth: 35, halign: 'center' },       // Telefone
        3: { cellWidth: 25, halign: 'center' },       // Status
      },
      alternateRowStyles: {
        fillColor: secondaryColor
      },
      margin: { top: 20, left: 15, right: 15, bottom: 25 },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });

    // --- PÓS-PROCESSAMENTO: RODAPÉ E HEADER PÁGINAS 2+ ---
    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Header compacto nas páginas 2+
      if (i > 1) {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 16, 'F');

        if (logoBase64) {
          try {
            doc.addImage(logoBase64, 'PNG', 6, 1, 14, 14);
          } catch (e) { /* skip */ }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATÓRIO DE AGENDAMENTOS', logoBase64 ? 24 : 15, 11);

        // Período no canto direito do header
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const headerPeriodo = dataInicio && dataFim && dataInicio !== dataFim
          ? `${formatDate(dataInicio)} a ${formatDate(dataFim)}`
          : formatDate(dataInicio || dataFim);
        const headerPeriodoWidth = doc.getStringUnitWidth(headerPeriodo) * 7 / doc.internal.scaleFactor;
        doc.text(headerPeriodo, pageWidth - 15 - headerPeriodoWidth, 11);
      }

      // Rodapé em todas as páginas
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 110, 110);

      // Data/hora (esquerda)
      const now = new Date();
      const dateStr = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(dateStr, 15, pageHeight - 12);

      // Atendente (centro)
      doc.setFont('helvetica', 'bold');
      const atendenteText = `${atendenteNome}`;
      const atendenteWidth = doc.getStringUnitWidth(atendenteText) * 7 / doc.internal.scaleFactor;
      doc.text(atendenteText, (pageWidth - atendenteWidth) / 2, pageHeight - 12);

      // Página (direita)
      doc.setFont('helvetica', 'normal');
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getStringUnitWidth(pageText) * 7 / doc.internal.scaleFactor;
      doc.text(pageText, pageWidth - 15 - pageTextWidth, pageHeight - 12);
    }

    // Salvar
    const fileName = dataInicio && dataFim && dataInicio !== dataFim
      ? `relatorio_agendamentos_${dataInicio}_a_${dataFim}.pdf`
      : `relatorio_agendamentos_${dataInicio || dataFim}.pdf`;
    doc.save(fileName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!user) {
        setMessage({ text: 'Usuário não autenticado', type: 'error' });
        return;
      }

      if (!dataInicio && !dataFim) {
        setMessage({ text: 'É necessário selecionar pelo menos uma data', type: 'error' });
        return;
      }

      // Renovar sessão para evitar erros CORS por token expirado
      const { error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Erro ao renovar sessão:', sessionError);
        setMessage({ text: 'Erro de autenticação. Tente recarregar a página.', type: 'error' });
        return;
      }

      let query = supabase
        .from('agendamentos')
        .select('id, nome, cpf, telefone, data, horario, status, posto');

      // Filtros de data
      if (dataInicio && dataFim) {
        query = query.gte('data', dataInicio).lte('data', dataFim);
      } else if (dataInicio) {
        query = query.eq('data', dataInicio);
      } else if (dataFim) {
        query = query.lte('data', dataFim);
      }

      if (nome) {
        query = query.ilike('nome', `%${nome}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (posto) {
        query = query.eq('posto', posto);
      }

      // Ordenação
      if (ordenacao === 'nome') {
        query = query.order('nome', { ascending: true });
      } else {
        query = query
          .order('data', { ascending: true })
          .order('horario', { ascending: true });
      }

      const { data: results, error } = await query;

      if (error) {
        console.error('Erro ao buscar agendamentos:', error);
        setMessage({ text: 'Erro ao buscar agendamentos: ' + error.message, type: 'error' });
        return;
      }

      if (!results || results.length === 0) {
        setMessage({ text: 'Nenhum agendamento encontrado com os filtros selecionados', type: 'error' });
        setAgendamentos([]);
        return;
      }

      // Contadores de status
      const counts: Record<string, number> = { total: results.length };
      results.forEach((ag: any) => {
        counts[ag.status] = (counts[ag.status] || 0) + 1;
      });
      setStatusCounts(counts);
      setAgendamentos(results);

      // Gerar PDF
      await generatePDF(results);
      setMessage({
        text: `Relatório gerado com sucesso! Total de registros: ${results.length}`,
        type: 'success'
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      setMessage({
        text: 'Erro ao gerar relatório: ' + (error as Error).message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAgendamentos = statusFilter
    ? agendamentos.filter(a => a.status === statusFilter)
    : agendamentos;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/relatorios')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Relatório de Agendamentos
            </h1>
            <p className="text-sm text-gray-600">
              Gere relatórios dos agendamentos com nome, CPF, telefone e status
            </p>
          </div>
        </div>

        {/* Formulário de Filtros */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>

          {/* Mensagens de feedback */}
          {message && (
            <div className={`mx-6 mt-4 p-4 border rounded-lg ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
              }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Data Inicial */}
              <div>
                <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inicial
                </label>
                <input
                  type="date"
                  id="dataInicio"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono text-sm"
                />
              </div>

              {/* Data Final */}
              <div>
                <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-2">
                  Data Final
                </label>
                <input
                  type="date"
                  id="dataFim"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono text-sm"
                />
              </div>

              {/* Nome */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-sm"
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-sm"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Posto */}
              <div>
                <label htmlFor="posto" className="block text-sm font-medium text-gray-700 mb-2">
                  Posto
                </label>
                <select
                  id="posto"
                  value={posto}
                  onChange={(e) => setPosto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-sm"
                >
                  {POSTOS.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              {/* Ordenação */}
              <div>
                <label htmlFor="ordenacao" className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  id="ordenacao"
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as 'padrao' | 'nome')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-sm"
                >
                  <option value="padrao">Data e Horário</option>
                  <option value="nome">Nome (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Botão de ação */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando relatório...
                  </span>
                ) : (
                  <span>Gerar Relatório</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Filtros de Status (Chips) */}
        {agendamentos.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="px-6 py-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Filtrar por Status</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter('')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${statusFilter === ''
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Todos
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                    {statusCounts.total || 0}
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter('confirmado')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${statusFilter === 'confirmado'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Confirmado
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                    {statusCounts.confirmado || 0}
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter('concluido')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${statusFilter === 'concluido'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Concluído
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                    {statusCounts.concluido || 0}
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter('cancelado')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${statusFilter === 'cancelado'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Cancelado
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                    {statusCounts.cancelado || 0}
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter('ausente')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${statusFilter === 'ausente'
                    ? 'bg-yellow-600 text-white border-yellow-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Ausente
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                    {statusCounts.ausente || 0}
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter('bloqueado')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${statusFilter === 'bloqueado'
                    ? 'bg-gray-600 text-white border-gray-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Bloqueado
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                    {statusCounts.bloqueado || 0}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de Agendamentos */}
        {agendamentos.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Agendamentos
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredAgendamentos.length} registros)
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPF
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAgendamentos.map((ag) => (
                    <tr key={ag.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ag.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatCPF(ag.cpf)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatPhone(ag.telefone)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatDate(ag.data)} {ag.horario?.substring(0, 5)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${ag.status === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                          ag.status === 'concluido' ? 'bg-green-100 text-green-800' :
                            ag.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                              ag.status === 'ausente' ? 'bg-yellow-100 text-yellow-800' :
                                ag.status === 'bloqueado' ? 'bg-gray-100 text-gray-800' :
                                  'bg-gray-100 text-gray-800'
                          }`}>
                          {ag.status.charAt(0).toUpperCase() + ag.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
