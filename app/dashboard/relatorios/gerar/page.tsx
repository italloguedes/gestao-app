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
    const title = 'Lista de Entrega - Sala Sensorial / ALECE';
    const titleWidth = doc.getStringUnitWidth(title) * 18 / doc.internal.scaleFactor;
    doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, 20);
    
    // Informações do período
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const periodo = `do dia ${formatDate(dataInicio)} até dia ${formatDate(dataInicio)}`;
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
    const col3 = 100; // CPF
    const col4 = 140; // Assinatura
    
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
    const fileName = `lista_entrega_${dataInicio}.pdf`;
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

      // Validação específica para lista de entrega
      if (tipoRelatorio === 'assinatura' && !dataInicio) {
        setMessage({ text: 'Para gerar a lista de entrega, é necessário selecionar uma data', type: 'error' });
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
        // Para lista de entrega, usar apenas a data inicial
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 py-8 px-4 pt-24">
      <div className="max-w-5xl mx-auto">
        {/* Header Modernizado */}
        <div className="mb-10 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-1.5 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Relatórios de Atendimentos
              </h1>
              <p className="text-gray-500 mt-2 text-base font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Configure filtros personalizados e gere relatórios em PDF
              </p>
            </div>
          </div>
        </div>

        {/* Card principal modernizado */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden animate-slide-up">
          {/* Header do card com gradiente sofisticado */}
          <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 px-8 py-6">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Filtros Personalizados</h2>
                  <p className="text-emerald-100 text-sm font-medium mt-0.5">Configure os parâmetros da sua consulta</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white text-xs font-semibold">Todos os campos são opcionais</span>
              </div>
            </div>
          </div>

          {/* Mensagens de feedback modernizadas */}
          {message && (
            <div className={`mx-8 mt-6 p-4 rounded-2xl border-2 text-sm animate-scale-in ${
              message.type === 'success'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200 shadow-lg shadow-green-100'
                : 'bg-gradient-to-r from-red-50 to-orange-50 text-red-800 border-red-200 shadow-lg shadow-red-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                } shadow-md`}>
                  {message.type === 'success' ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {message.type === 'success' ? 'Sucesso!' : 'Atenção!'}
                  </p>
                  <p className="font-medium text-sm mt-0.5">{message.text}</p>
                </div>
              </div>
            </div>
          )}

          {/* Formulário Modernizado */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data Inicial - Design Moderno */}
              <div className="group">
                <label htmlFor="dataInicio" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-2 group-hover:bg-emerald-200 transition-colors">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  {tipoRelatorio === 'assinatura' ? 'Data' : 'Data Inicial'}
                  <span className="ml-auto text-xs font-normal text-gray-400">(Opcional)</span>
                </label>
                <input
                  type="date"
                  id="dataInicio"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 hover:border-emerald-300 hover:shadow-md bg-white"
                />
              </div>

              {/* Data Final - apenas para relatório completo */}
              {tipoRelatorio === 'completo' && (
                <div className="group">
                  <label htmlFor="dataFim" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-2 group-hover:bg-blue-200 transition-colors">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    Data Final
                    <span className="ml-auto text-xs font-normal text-gray-400">(Opcional)</span>
                  </label>
                  <input
                    type="date"
                    id="dataFim"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 hover:border-blue-300 hover:shadow-md bg-white"
                  />
                </div>
              )}

              {/* Nome do Cliente */}
              <div className="group">
                <label htmlFor="nome" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mr-2 group-hover:bg-purple-200 transition-colors">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Nome do Cliente
                  <span className="ml-auto text-xs font-normal text-gray-400">(Opcional)</span>
                </label>
                <input
                  type="text"
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome do cliente..."
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 hover:border-purple-300 hover:shadow-md bg-white"
                />
              </div>

              {/* Solicitante */}
              <div className="group">
                <label htmlFor="solicitante" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mr-2 group-hover:bg-orange-200 transition-colors">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  Solicitante
                  <span className="ml-auto text-xs font-normal text-gray-400">(Opcional)</span>
                </label>
                <input
                  type="text"
                  id="solicitante"
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                  placeholder="Digite o nome do solicitante..."
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 hover:border-orange-300 hover:shadow-md bg-white"
                />
              </div>

              {/* Status - Ocupa duas colunas */}
              <div className="md:col-span-2 group">
                <label htmlFor="status" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mr-2 group-hover:bg-green-200 transition-colors">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Status do Atendimento
                  <span className="ml-auto text-xs font-normal text-gray-400">(Opcional)</span>
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-green-500 focus:ring-4 focus:ring-green-100 focus:outline-none transition-all duration-300 text-gray-700 hover:border-green-300 hover:shadow-md bg-white font-medium cursor-pointer"
                >
                  <option value="">🔍 Todos os status</option>
                  <option value="confirmado">✅ Confirmado</option>
                  <option value="concluido">✅ Concluído</option>
                  <option value="cancelado">❌ Cancelado</option>
                  <option value="ausente">⏰ Ausente</option>
                  <option value="bloqueado">🚫 Bloqueado</option>
                </select>
              </div>

              {/* Tipo de Relatório */}
              <div className="md:col-span-2 group">
                <label htmlFor="tipoRelatorio" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-2 group-hover:bg-indigo-200 transition-colors">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Tipo de Relatório
                  <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">Importante</span>
                </label>
                <select
                  id="tipoRelatorio"
                  value={tipoRelatorio}
                  onChange={(e) => setTipoRelatorio(e.target.value as 'completo' | 'assinatura')}
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-300 text-gray-700 hover:border-indigo-300 hover:shadow-md bg-white font-medium cursor-pointer"
                >
                  <option value="completo">📊 Relatório Completo (Tabela com todos os dados)</option>
                  <option value="assinatura">✍️ Lista de Entrega (Nome, CPF e campo para assinatura)</option>
                </select>
              </div>

              {/* Ordenação */}
              <div className="md:col-span-2 group">
                <label htmlFor="ordenacao" className="flex items-center text-sm font-bold text-gray-700 mb-3 group-hover:text-emerald-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center mr-2 group-hover:bg-pink-200 transition-colors">
                    <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h6" />
                    </svg>
                  </div>
                  Ordenar por
                  <span className="ml-auto text-xs font-normal text-gray-400">(Opcional)</span>
                </label>
                <select
                  id="ordenacao"
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as 'padrao' | 'nome')}
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 shadow-sm focus:border-pink-500 focus:ring-4 focus:ring-pink-100 focus:outline-none transition-all duration-300 text-gray-700 hover:border-pink-300 hover:shadow-md bg-white font-medium cursor-pointer"
                >
                  <option value="padrao">📅 Padrão (Data e Horário)</option>
                  <option value="nome">🔤 Nome (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Botão de ação modernizado */}
            <div className="mt-10 pt-8 border-t-2 border-gray-100">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p className="font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Dica: Deixe os campos vazios para buscar todos
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full md:w-auto inline-flex items-center justify-center px-10 py-4 border-2 border-transparent text-base font-bold rounded-2xl shadow-xl text-white bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 hover:from-emerald-700 hover:via-emerald-800 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      <span className="relative z-10">
                        {tipoRelatorio === 'assinatura' ? 'Gerando lista de entrega...' : 'Gerando relatório...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="relative z-10">
                        {tipoRelatorio === 'assinatura' ? '✍️ Gerar Lista de Entrega PDF' : '📊 Gerar Relatório PDF'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Informações adicionais */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm">Relatório Completo</h3>
                <p className="text-xs text-blue-700 mt-1">Tabela detalhada com todas as informações dos atendimentos</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border-2 border-purple-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-purple-900 text-sm">Lista de Entrega</h3>
                <p className="text-xs text-purple-700 mt-1">Formato otimizado para coletar assinaturas físicas</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 border-2 border-emerald-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-emerald-900 text-sm">Filtros Avançados</h3>
                <p className="text-xs text-emerald-700 mt-1">Combine múltiplos filtros para resultados precisos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
