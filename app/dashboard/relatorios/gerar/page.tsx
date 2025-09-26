'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export default function GerarRelatorioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [nome, setNome] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [status, setStatus] = useState('');
  const [ordenacao, setOrdenacao] = useState<'padrao' | 'nome'>('padrao');
  const [tipoRelatorio, setTipoRelatorio] = useState<'completo' | 'assinatura'>('completo');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
    const doc = new jsPDF();
    
    // Configurações de estilo
    const primaryColor = [0, 135, 81] as [number, number, number]; // Verde ALECE
    const secondaryColor = [248, 249, 250] as [number, number, number]; // Cinza mais claro para melhor legibilidade
    
    // Calcula a largura total da tabela
    const tableWidth = 150; // Soma das larguras das colunas
    const marginLeft = (doc.internal.pageSize.width - tableWidth) / 2;
    
    // Cabeçalho mais compacto e centralizado
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
    doc.setTextColor(255, 255, 255);
    const titleFontSize = 16;
    doc.setFontSize(titleFontSize);
    const title = 'Relatório de Atendimentos - Sala Sensorial / ALECE';
    const titleWidth = doc.getStringUnitWidth(title) * titleFontSize / doc.internal.scaleFactor;
    doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, 16);
    
    // Informações do período mais compactas e centralizadas
    doc.setTextColor(90, 90, 90);
    const infoFontSize = 9;
    doc.setFontSize(infoFontSize);
    const periodo = `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`;
    const total = `Total de Atendimentos: ${atendimentos.length}`;
    
    // Centraliza as informações do período
    const periodoWidth = doc.getStringUnitWidth(periodo) * infoFontSize / doc.internal.scaleFactor;
    const totalWidth = doc.getStringUnitWidth(total) * infoFontSize / doc.internal.scaleFactor;
    const infosWidth = periodoWidth + 20 + totalWidth; // 20 é o espaço entre os textos
    const infosStartX = (doc.internal.pageSize.width - infosWidth) / 2;
    
    doc.text(periodo, infosStartX, 30);
    doc.text(total, infosStartX + periodoWidth + 20, 30);

    // Adiciona linha decorativa centralizada
    const lineWidth = 170;
    const lineStartX = (doc.internal.pageSize.width - lineWidth) / 2;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(lineStartX, 33, lineStartX + lineWidth, 33);
    
    // Configuração da tabela otimizada
    const tableColumn = ['Data', 'Nome', 'CPF', 'Solicitante', 'Status'];
    const tableRows = atendimentos.map(atendimento => [
      formatDate(atendimento.dia_atual),
      atendimento.nome.length > 35 ? atendimento.nome.substring(0, 32) + '...' : atendimento.nome,
      atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
      atendimento.solicitante.length > 25 ? atendimento.solicitante.substring(0, 22) + '...' : atendimento.solicitante,
      atendimento.status.charAt(0).toUpperCase() + atendimento.status.slice(1).toLowerCase()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 38,
      styles: {
        fontSize: 8,
        cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
        lineColor: [230, 230, 230],
        lineWidth: 0.05,
        minCellHeight: 6,
        cellWidth: 'wrap',
        overflow: 'hidden',
        textColor: [50, 50, 50]
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
        minCellHeight: 8
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' }, // Data
        1: { cellWidth: 52, halign: 'left' },   // Nome
        2: { cellWidth: 30, halign: 'center' }, // CPF
        3: { cellWidth: 35, halign: 'left' },   // Solicitante
        4: { cellWidth: 20, halign: 'center' }  // Status
      },
      alternateRowStyles: {
        fillColor: secondaryColor
      },
      margin: { left: marginLeft },
      rowPageBreak: 'avoid',
      showFoot: 'lastPage',
      didDrawCell: (data) => {
        if (data.cell.text) {
          data.cell.styles.cellWidth = 'auto';
        }
      }
    });

    // Rodapé modernizado e centralizado
    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const footerFontSize = 7;
      doc.setFontSize(footerFontSize);
      doc.setTextColor(128, 128, 128);
      
      // Linha separadora do rodapé centralizada
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(lineStartX, doc.internal.pageSize.height - 15, lineStartX + lineWidth, doc.internal.pageSize.height - 15);
      
      // Data e hora de geração
      const now = new Date();
      const dataHoraGeracao = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
      doc.text(dataHoraGeracao, marginLeft, doc.internal.pageSize.height - 8);
      
      // Número da página
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getStringUnitWidth(pageText) * footerFontSize / doc.internal.scaleFactor;
      doc.text(pageText, marginLeft + tableWidth - pageTextWidth, doc.internal.pageSize.height - 8);
    }

    // Salvar o PDF
    const fileName = `relatorio_atendimentos_${dataInicio}_a_${dataFim}.pdf`;
    doc.save(fileName);
  };

  const generateSignaturePDF = async (atendimentos: Atendimento[]) => {
    const doc = new jsPDF();
    
    // Configurações de estilo
    const primaryColor = [0, 135, 81] as [number, number, number]; // Verde ALECE
    
    // Cabeçalho
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = 'Lista de Presença - Sala Sensorial / ALECE';
    const titleWidth = doc.getStringUnitWidth(title) * 18 / doc.internal.scaleFactor;
    doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, 20);
    
    // Informações do período
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const periodo = `Data: ${formatDate(dataInicio)}`;
    const periodoWidth = doc.getStringUnitWidth(periodo) * 12 / doc.internal.scaleFactor;
    doc.text(periodo, (doc.internal.pageSize.width - periodoWidth) / 2, 35);
    
    // Linha separadora
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(20, 40, doc.internal.pageSize.width - 20, 40);
    
    // Cabeçalho da tabela
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    
    // Posições das colunas
    const col1 = 25; // Número
    const col2 = 40; // Nome
    const col3 = 120; // CPF
    const col4 = 160; // Assinatura
    
    // Cabeçalhos
    doc.text('Nº', col1, 50);
    doc.text('Nome Completo', col2, 50);
    doc.text('CPF', col3, 50);
    doc.text('Assinatura', col4, 50);
    
    // Linha do cabeçalho
    doc.setDrawColor(0, 135, 81);
    doc.setLineWidth(1);
    doc.line(20, 52, doc.internal.pageSize.width - 20, 52);
    
    // Linhas para os dados
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    let currentY = 60;
    const lineHeight = 8;
    
    atendimentos.forEach((atendimento, index) => {
      // Verificar se precisa de nova página
      if (currentY > doc.internal.pageSize.height - 40) {
        doc.addPage();
        currentY = 30;
      }
      
      // Número
      doc.text((index + 1).toString(), col1, currentY);
      
      // Nome (truncado se muito longo)
      const nome = atendimento.nome.length > 30 ? atendimento.nome.substring(0, 27) + '...' : atendimento.nome;
      doc.text(nome, col2, currentY);
      
      // CPF formatado
      const cpfFormatado = atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      doc.text(cpfFormatado, col3, currentY);
      
      // Linha para assinatura
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      doc.line(col4, currentY - 2, col4 + 30, currentY - 2);
      
      // Linha horizontal separadora
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, currentY + 2, doc.internal.pageSize.width - 20, currentY + 2);
      
      currentY += lineHeight;
    });
    
    // Rodapé
    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      
      // Data e hora de geração
      const now = new Date();
      const dataHoraGeracao = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
      doc.text(dataHoraGeracao, 20, doc.internal.pageSize.height - 15);
      
      // Número da página
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getStringUnitWidth(pageText) * 8 / doc.internal.scaleFactor;
      doc.text(pageText, doc.internal.pageSize.width - pageTextWidth - 20, doc.internal.pageSize.height - 15);
    }

    // Salvar o PDF
    const fileName = `lista_presenca_${dataInicio}.pdf`;
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

      // Validação específica para lista de presença
      if (tipoRelatorio === 'assinatura' && !dataInicio) {
        setMessage({ text: 'Para gerar a lista de presença, é necessário selecionar uma data', type: 'error' });
        return;
      }

      // Validação para relatório completo
      if (tipoRelatorio === 'completo' && !dataInicio && !dataFim) {
        setMessage({ text: 'Para gerar o relatório completo, é necessário selecionar pelo menos uma data', type: 'error' });
        return;
      }

      let query = supabase
        .from('atendimentos')
        .select('*');

      // Aplicar filtros apenas se estiverem preenchidos
      if (tipoRelatorio === 'assinatura') {
        // Para lista de presença, usar apenas a data inicial
        if (dataInicio) {
          const dataInicioAjustada = dataInicio + 'T00:00:00';
          const dataFimAjustada = dataInicio + 'T23:59:59';
          query = query
            .gte('dia_atual', dataInicioAjustada)
            .lte('dia_atual', dataFimAjustada);
        }
      } else {
        // Para relatório completo, usar período
        if (dataInicio && dataFim) {
          const dataInicioAjustada = dataInicio + 'T00:00:00';
          const dataFimAjustada = dataFim + 'T23:59:59';
          query = query
            .gte('dia_atual', dataInicioAjustada)
            .lte('dia_atual', dataFimAjustada);
        }
      }

      if (nome) {
        query = query.ilike('nome', `%${nome}%`);
      }

      if (solicitante) {
        query = query.ilike('solicitante', `%${solicitante}%`);
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

      console.log('Gerando PDF para', atendimentos.length, 'atendimentos');
      
      if (tipoRelatorio === 'assinatura') {
        await generateSignaturePDF(atendimentos);
        setMessage({ 
          text: `Lista de presença gerada com sucesso! Total de registros: ${atendimentos.length}`,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header com gradiente e ícone */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerar Relatório</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Utilize os filtros abaixo para personalizar seu relatório de atendimentos da Sala Sensorial
          </p>
        </div>

        {/* Card principal com sombra e bordas arredondadas */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header do card */}
          <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Filtros de Relatório</h2>
                <p className="text-primary-100 text-sm">Configure os parâmetros para sua consulta</p>
              </div>
            </div>
          </div>

          {/* Mensagens de feedback */}
          {message && (
            <div className={`mx-6 mt-4 p-2.5 rounded-lg border-l-2 text-sm ${
              message.type === 'success' 
                ? 'bg-green-50/80 text-green-700 border-green-300' 
                : 'bg-red-50/80 text-red-700 border-red-300'
            }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  message.type === 'success' ? 'bg-green-400' : 'bg-red-400'
                }`}>
                  {message.type === 'success' ? (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-xs">{message.text}</span>
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data Inicial */}
              <div className="space-y-2">
                <label htmlFor="dataInicio" className="flex items-center text-sm font-semibold text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {tipoRelatorio === 'assinatura' ? 'Data' : 'Data Inicial'}
                </label>
                <input
                  type="date"
                  id="dataInicio"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 text-gray-700 placeholder-gray-400 hover:border-gray-300"
                />
              </div>

              {/* Data Final - apenas para relatório completo */}
              {tipoRelatorio === 'completo' && (
                <div className="space-y-2">
                  <label htmlFor="dataFim" className="flex items-center text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Data Final
                  </label>
                  <input
                    type="date"
                    id="dataFim"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 text-gray-700 placeholder-gray-400 hover:border-gray-300"
                  />
                </div>
              )}

              {/* Nome do Cliente */}
              <div className="space-y-2">
                <label htmlFor="nome" className="flex items-center text-sm font-semibold text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 text-gray-700 placeholder-gray-400 hover:border-gray-300"
                />
              </div>

              {/* Solicitante */}
              <div className="space-y-2">
                <label htmlFor="solicitante" className="flex items-center text-sm font-semibold text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Solicitante
                </label>
                <input
                  type="text"
                  id="solicitante"
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                  placeholder="Digite o nome do solicitante"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 text-gray-700 placeholder-gray-400 hover:border-gray-300"
                />
              </div>

              {/* Status - Ocupa duas colunas */}
              <div className="md:col-span-2 space-y-2">
                <label htmlFor="status" className="flex items-center text-sm font-semibold text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Status do Atendimento
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 text-gray-700 hover:border-gray-300 bg-white"
                >
                  <option value="">Todos os status</option>
                  <option value="confirmado">✅ Confirmado</option>
                  <option value="concluido">✅ Concluído</option>
                  <option value="cancelado">❌ Cancelado</option>
                  <option value="ausente">⏰ Ausente</option>
                  <option value="bloqueado">🚫 Bloqueado</option>
                </select>
              </div>
              {/* Tipo de Relatório */}
              <div className="md:col-span-2 space-y-2">
                <label htmlFor="tipoRelatorio" className="flex items-center text-sm font-semibold text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Tipo de Relatório
                </label>
                <select
                  id="tipoRelatorio"
                  value={tipoRelatorio}
                  onChange={(e) => setTipoRelatorio(e.target.value as 'completo' | 'assinatura')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 text-gray-700 hover:border-gray-300 bg-white"
                >
                  <option value="completo">Relatório Completo (Tabela com todos os dados)</option>
                  <option value="assinatura">Lista de Presença (Nome, CPF e campo para assinatura)</option>
                </select>
              </div>

              {/* Ordenação */}
              <div className="md:col-span-2 space-y-2">
                <label htmlFor="ordenacao" className="flex items-center text-sm font-semibold text-gray-700">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h6" />
                  </svg>
                  Ordenar por
                </label>
                <select
                  id="ordenacao"
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as 'padrao' | 'nome')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 text-gray-700 hover:border-gray-300 bg-white"
                >
                  <option value="padrao">Padrão (Data e Horário)</option>
                  <option value="nome">Nome (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Botão de ação */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span>{tipoRelatorio === 'assinatura' ? 'Gerando lista de presença...' : 'Gerando relatório...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {tipoRelatorio === 'assinatura' ? 'Gerar Lista de Presença PDF' : 'Gerar Relatório PDF'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        
      </div>
    </div>
  );
}
