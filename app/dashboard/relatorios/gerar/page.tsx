'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MultiSelectAsync from '@/components/MultiSelectAsync';
import { searchApplicants } from '../actions';

interface Atendimento {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  protocolo: string;
  dia_atual: string;
  horario: string;
  status: string;
  solicitante: string;
}

const statusOptions = [
  { value: '', label: 'Todos', count: 0 },
  { value: 'confirmado', label: 'Confirmado', count: 0 },
  { value: 'concluido', label: 'Concluído', count: 0 },
  { value: 'cancelado', label: 'Cancelado', count: 0 },
  { value: 'ausente', label: 'Ausente', count: 0 },
  { value: 'bloqueado', label: 'Bloqueado', count: 0 },
];

export default function GerarRelatorioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [nome, setNome] = useState('');
  const [solicitantes, setSolicitantes] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [ordenacao, setOrdenacao] = useState<'padrao' | 'nome'>('padrao');
  const [tipoRelatorio, setTipoRelatorio] = useState<'completo' | 'assinatura'>('completo');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [atendimentosFiltrados, setAtendimentosFiltrados] = useState<Atendimento[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
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
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const generatePDF = async (atendimentos: Atendimento[]) => {
    // Buscar nome do atendente para o rodapé
    let atendenteNome = 'Não identificado';
    if (user) {
      atendenteNome = user.user_metadata?.name || user.user_metadata?.full_name || 'Não identificado';
    }

    const doc = new jsPDF();
    const primaryColor = [0, 135, 81] as [number, number, number]; // Verde ALECE
    const secondaryColor = [248, 249, 250] as [number, number, number]; // Cinza mais claro

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Calcula a largura total da tabela
    const marginX = 10;
    const tableWidth = pageWidth - 2 * marginX; // 190
    const marginLeft = marginX;

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
    const title = 'RELATÓRIO DE ATENDIMENTOS';
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
    const totalText = `Total: ${atendimentos.length} ${atendimentos.length === 1 ? 'atendimento' : 'atendimentos'}`;
    const infoText = `${periodoText}  |  ${totalText}`;
    const infoWidth = doc.getStringUnitWidth(infoText) * 9 / doc.internal.scaleFactor;
    const infoX = logoBase64 ? 52 + (pageWidth - 52 - infoWidth) / 2 : (pageWidth - infoWidth) / 2;
    doc.text(infoText, infoX, 32);

    // Configuração da tabela otimizada
    const tableColumn = ['Nº', 'Data', 'Nome', 'CPF', 'Solicitante', 'Status'];
    const tableRows = atendimentos.map((atendimento, index) => [
      (index + 1).toString(),
      formatDate(atendimento.dia_atual),
      atendimento.nome,
      atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
      atendimento.solicitante,
      atendimento.status.charAt(0).toUpperCase() + atendimento.status.slice(1).toLowerCase()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 48,
      styles: {
        fontSize: 6.5,
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
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' }, // Nº
        1: { cellWidth: 18, halign: 'center' }, // Data
        2: { cellWidth: 76, halign: 'left' },   // Nome
        3: { cellWidth: 25, halign: 'center' }, // CPF
        4: { cellWidth: 38, halign: 'left' },   // Solicitante
        5: { cellWidth: 23, halign: 'center' }  // Status
      },
      alternateRowStyles: {
        fillColor: secondaryColor
      },
      margin: { top: 20, left: marginLeft, right: marginLeft, bottom: 25 },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      didDrawCell: (data) => {
        if (data.cell.text) {
          data.cell.styles.cellWidth = 'auto';
        }
      }
    });

    // --- PÓS-PROCESSAMENTO: RODAPÉ E HEADER PÁGINAS 2+ ---
    const pageCount = (doc as any).getNumberOfPages();
    const lineStartX = marginX;
    const lineWidth = pageWidth - 2 * marginX;

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
        doc.text('RELATÓRIO DE ATENDIMENTOS', logoBase64 ? 24 : 15, 11);

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
      const footerFontSize = 7;
      doc.setFontSize(footerFontSize);
      doc.setTextColor(128, 128, 128);

      // Linha separadora do rodapé centralizada
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(lineStartX, pageHeight - 15, lineStartX + lineWidth, pageHeight - 15);

      // Data e hora de geração
      const now = new Date();
      const dataHoraGeracao = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
      doc.text(dataHoraGeracao, marginLeft, pageHeight - 8);

      // Nome do atendente (centralizado)
      const atendenteText = `Atendente: ${atendenteNome}`;
      const atendenteTextWidth = doc.getStringUnitWidth(atendenteText) * footerFontSize / doc.internal.scaleFactor;
      doc.text(atendenteText, (pageWidth - atendenteTextWidth) / 2, pageHeight - 8);

      // Número da página
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getStringUnitWidth(pageText) * footerFontSize / doc.internal.scaleFactor;
      doc.text(pageText, marginLeft + tableWidth - pageTextWidth, pageHeight - 8);
    }

    // Salvar o PDF
    const fileName = `relatorio_atendimentos_${dataInicio}_a_${dataFim}.pdf`;
    doc.save(fileName);
  };

  const generateSignaturePDF = async (atendimentos: Atendimento[]) => {
    // Buscar nome do atendente para o rodapé
    let atendenteNome = 'Não identificado';
    if (user) {
      atendenteNome = user.user_metadata?.name || user.user_metadata?.full_name || 'Não identificado';
    }

    const doc = new jsPDF();
    const primaryColor = [0, 135, 81] as [number, number, number]; // Verde ALECE
    const accentColor = [232, 245, 233] as [number, number, number]; // Verde claro
    const borderColor = [200, 230, 201] as [number, number, number]; // Borda verde suave

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
    const title = 'LISTA DE ENTREGA';
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

    // Box de informações do período
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(10, 48, pageWidth - 20, 12, 2, 2, 'F');

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const periodo = dataInicio && dataFim && dataInicio !== dataFim
      ? `PERÍODO: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`
      : `DATA: ${formatDate(dataInicio || dataFim)}`;
    const periodoWidth = doc.getStringUnitWidth(periodo) * 9 / doc.internal.scaleFactor;
    doc.text(periodo, (pageWidth - periodoWidth) / 2, 55);

    // Total de atendimentos
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const totalText = `Total: ${atendimentos.length} ${atendimentos.length === 1 ? 'atendimento' : 'atendimentos'}`;
    const totalWidth = doc.getStringUnitWidth(totalText) * 8 / doc.internal.scaleFactor;
    doc.text(totalText, pageWidth - 10 - totalWidth, 55);

    // Tabela otimizada com AutoTable
    const tableColumn = ['Nº', 'Nome Completo', 'CPF', 'Assinatura'];
    const tableRows = atendimentos.map((atendimento, index) => [
      (index + 1).toString(),
      atendimento.nome, // Nome completo sem truncar
      atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
      '' // Espaço para assinatura
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 65,
      styles: {
        fontSize: 6.5,
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        lineColor: borderColor,
        lineWidth: 0.1,
        minCellHeight: 12,
        textColor: [40, 40, 40],
        overflow: 'ellipsize',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
        lineWidth: 0
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [0, 135, 81] }, // Nº
        1: { cellWidth: 95, halign: 'left', overflow: 'ellipsize' }, // Nome Completo
        2: { cellWidth: 30, halign: 'center', fontStyle: 'normal', font: 'courier' }, // CPF
        3: { cellWidth: 55, halign: 'center', fillColor: [250, 250, 250] } // Assinatura
      },
      alternateRowStyles: {
        fillColor: [252, 252, 252]
      },
      margin: { top: 20, left: 10, right: 10, bottom: 25 },
      rowPageBreak: 'avoid',
      showHead: 'everyPage'
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
        doc.text('LISTA DE ENTREGA', logoBase64 ? 24 : 10, 11);

        // Período no canto direito do header
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const headerPeriodo = dataInicio && dataFim && dataInicio !== dataFim
          ? `${formatDate(dataInicio)} a ${formatDate(dataFim)}`
          : formatDate(dataInicio || dataFim);
        const headerPeriodoWidth = doc.getStringUnitWidth(headerPeriodo) * 7 / doc.internal.scaleFactor;
        doc.text(headerPeriodo, pageWidth - 10 - headerPeriodoWidth, 11);
      }

      // Rodapé
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.5);
      doc.line(10, pageHeight - 18, pageWidth - 10, pageHeight - 18);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 110, 110);

      // Data e hora de geração (esquerda)
      const now = new Date();
      const dataHoraGeracao = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(dataHoraGeracao, 10, pageHeight - 12);

      // Nome do atendente (centro)
      doc.setFont('helvetica', 'bold');
      const atendenteText = `${atendenteNome}`;
      const atendenteTextWidth = doc.getStringUnitWidth(atendenteText) * 7 / doc.internal.scaleFactor;
      doc.text(atendenteText, (pageWidth - atendenteTextWidth) / 2, pageHeight - 12);

      // Número da página (direita)
      doc.setFont('helvetica', 'normal');
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getStringUnitWidth(pageText) * 7 / doc.internal.scaleFactor;
      doc.text(pageText, pageWidth - pageTextWidth - 10, pageHeight - 12);
    }

    // Salvar o PDF
    const fileName = dataInicio && dataFim && dataInicio !== dataFim
      ? `lista_entrega_${dataInicio}_a_${dataFim}.pdf`
      : `lista_entrega_${dataInicio || dataFim}.pdf`;
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

      // Validação de datas
      if (!dataInicio && !dataFim) {
        setMessage({ text: 'É necessário selecionar pelo menos uma data', type: 'error' });
        return;
      }

      let query = supabase
        .from('atendimentos')
        .select('*');

      // Aplicar filtros de data
      if (dataInicio && dataFim) {
        // Se ambas as datas estão preenchidas, usar intervalo
        const dataInicioAjustada = dataInicio + 'T00:00:00';
        const dataFimAjustada = dataFim + 'T23:59:59';
        query = query
          .gte('dia_atual', dataInicioAjustada)
          .lte('dia_atual', dataFimAjustada);
      } else if (dataInicio) {
        // Se apenas data inicial, usar do início deste dia até o fim
        const dataInicioAjustada = dataInicio + 'T00:00:00';
        const dataFimAjustada = dataInicio + 'T23:59:59';
        query = query
          .gte('dia_atual', dataInicioAjustada)
          .lte('dia_atual', dataFimAjustada);
      } else if (dataFim) {
        // Se apenas data final, usar até o fim deste dia
        const dataFimAjustada = dataFim + 'T23:59:59';
        query = query.lte('dia_atual', dataFimAjustada);
      }

      if (nome) {
        query = query.ilike('nome', `%${nome}%`);
      }

      if (solicitantes.length > 0) {
        query = query.in('solicitante', solicitantes);
      }

      if (status) {
        query = query.eq('status', status);
      }

      // Ordenação condicional conforme seleção do usuário
      if (ordenacao === 'nome') {
        query = query.order('nome', { ascending: true });
      } else {
        query = query
          .order('dia_atual', { ascending: true })
          .order('horario', { ascending: true });
      }

      const { data: atendimentos, error } = await query;

      if (error) {
        console.error('Erro ao buscar atendimentos:', error);
        setMessage({ text: 'Erro ao buscar atendimentos: ' + error.message, type: 'error' });
        return;
      }

      if (!atendimentos || atendimentos.length === 0) {
        setMessage({ text: 'Nenhum atendimento encontrado com os filtros selecionados', type: 'error' });
        return;
      }

      // Calcular contadores de status
      const counts: Record<string, number> = { total: atendimentos.length };
      atendimentos.forEach((atendimento: any) => {
        counts[atendimento.status] = (counts[atendimento.status] || 0) + 1;
      });
      setStatusCounts(counts);
      setAtendimentosFiltrados(atendimentos);

      console.log('Gerando PDF para', atendimentos.length, 'atendimentos');

      if (tipoRelatorio === 'assinatura') {
        await generateSignaturePDF(atendimentos);
        setMessage({
          text: `Lista de entrega gerada com sucesso! Total de registros: ${atendimentos.length}`,
          type: 'success'
        });
      } else {
        await generatePDF(atendimentos);
        setMessage({
          text: `Relatório gerado com sucesso! Total de registros: ${atendimentos.length}`,
          type: 'success'
        });
      }

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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header Técnico */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Relatórios de Atendimentos
          </h1>
          <p className="text-sm text-gray-600">
            Configure os filtros e gere relatórios em PDF
          </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

              {/* Nome do Cliente */}
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

              {/* Solicitante */}
              <div>
                <MultiSelectAsync
                  label="Solicitantes"
                  placeholder="Pesquisar solicitante..."
                  fetchOptions={searchApplicants}
                  value={solicitantes}
                  onChange={setSolicitantes}
                />
              </div>

              {/* Tipo de Relatório */}
              <div>
                <label htmlFor="tipoRelatorio" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Relatório
                </label>
                <select
                  id="tipoRelatorio"
                  value={tipoRelatorio}
                  onChange={(e) => setTipoRelatorio(e.target.value as 'completo' | 'assinatura')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-sm"
                >
                  <option value="completo">Relatório Completo</option>
                  <option value="assinatura">Lista de Entrega</option>
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
                    {tipoRelatorio === 'assinatura' ? 'Gerando lista...' : 'Gerando relatório...'}
                  </span>
                ) : (
                  <span>{tipoRelatorio === 'assinatura' ? 'Gerar Lista de Entrega' : 'Gerar Relatório'}</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Filtros de Status (Chips) */}
        {atendimentosFiltrados.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="px-6 py-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Filtrar por Status</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatus('')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === ''
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
                  onClick={() => setStatus('confirmado')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'confirmado'
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
                  onClick={() => setStatus('concluido')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'concluido'
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
                  onClick={() => setStatus('cancelado')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'cancelado'
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
                  onClick={() => setStatus('ausente')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'ausente'
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
                  onClick={() => setStatus('bloqueado')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'bloqueado'
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

        {/* Tabela de Atendimentos */}
        {atendimentosFiltrados.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Atendimentos
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({atendimentosFiltrados.filter(a => !status || a.status === status).length} registros)
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Protocolo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPF
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
                  {atendimentosFiltrados
                    .filter(atendimento => !status || atendimento.status === status)
                    .map((atendimento) => (
                      <tr key={atendimento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {atendimento.protocolo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {atendimento.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {formatDate(atendimento.dia_atual)} {formatTime(atendimento.horario)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${atendimento.status === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                            atendimento.status === 'concluido' ? 'bg-green-100 text-green-800' :
                              atendimento.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                                atendimento.status === 'ausente' ? 'bg-yellow-100 text-yellow-800' :
                                  atendimento.status === 'bloqueado' ? 'bg-gray-100 text-gray-800' :
                                    'bg-gray-100 text-gray-800'
                            }`}>
                            {atendimento.status.charAt(0).toUpperCase() + atendimento.status.slice(1)}
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
