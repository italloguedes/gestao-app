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
    doc.setFontSize(16);
    const title = 'Relatório de Atendimentos - Sala Sensorial / ALECE';
    const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor;
    doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, 16);
    
    // Informações do período mais compactas e centralizadas
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(9);
    const periodo = `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`;
    const total = `Total de Atendimentos: ${atendimentos.length}`;
    
    // Centraliza as informações do período
    const periodoWidth = doc.getStringUnitWidth(periodo) * doc.getFontSize() / doc.internal.scaleFactor;
    const totalWidth = doc.getStringUnitWidth(total) * doc.getFontSize() / doc.internal.scaleFactor;
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
        2: { cellWidth: 23, halign: 'center' }, // CPF
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
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
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
      const pageTextWidth = doc.getStringUnitWidth(pageText) * doc.getFontSize() / doc.internal.scaleFactor;
      doc.text(pageText, marginLeft + tableWidth - pageTextWidth, doc.internal.pageSize.height - 8);
    }

    // Salvar o PDF
    const fileName = `relatorio_atendimentos_${dataInicio}_a_${dataFim}.pdf`;
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

      if (!dataInicio || !dataFim) {
        setMessage({ text: 'Por favor, selecione as datas inicial e final', type: 'error' });
        return;
      }

      console.log('Buscando atendimentos...', { dataInicio, dataFim });

      const dataInicioAjustada = dataInicio + 'T00:00:00';
      const dataFimAjustada = dataFim + 'T23:59:59';

      const { data: atendimentos, error } = await supabase
        .from('atendimentos')
        .select('*')
        .gte('dia_atual', dataInicioAjustada)
        .lte('dia_atual', dataFimAjustada)
        .order('dia_atual', { ascending: true })
        .order('horario', { ascending: true });

      if (error) {
        console.error('Erro ao buscar atendimentos:', error);
        setMessage({ text: 'Erro ao buscar atendimentos: ' + error.message, type: 'error' });
        return;
      }

      if (!atendimentos || atendimentos.length === 0) {
        setMessage({ text: 'Nenhum atendimento encontrado no período selecionado', type: 'error' });
        return;
      }

      console.log('Gerando PDF para', atendimentos.length, 'atendimentos');
      await generatePDF(atendimentos);

      setMessage({ 
        text: `Relatório gerado com sucesso! Total de registros: ${atendimentos.length}`,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerar Relatório</h1>
        <p className="text-gray-600 mt-2">Selecione o período para gerar o relatório de atendimentos</p>
      </div>

      <div className="card p-6">
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700">
                Data Inicial
              </label>
              <input
                type="date"
                id="dataInicio"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="input mt-1"
                required
              />
            </div>

            <div>
              <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700">
                Data Final
              </label>
              <input
                type="date"
                id="dataFim"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="input mt-1"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? <Loading /> : 'Gerar Relatório'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
