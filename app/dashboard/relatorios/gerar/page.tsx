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
    const secondaryColor = [240, 240, 240] as [number, number, number]; // Cinza claro para linhas alternadas
    
    // Cabeçalho
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    const title = 'Relatório de Atendimentos';
    const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor;
    doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, 20);
    
    // Informações do período
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    const periodo = `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`;
    const total = `Total de Atendimentos: ${atendimentos.length}`;
    const periodoWidth = doc.getStringUnitWidth(periodo) * doc.getFontSize() / doc.internal.scaleFactor;
    const totalWidth = doc.getStringUnitWidth(total) * doc.getFontSize() / doc.internal.scaleFactor;
    doc.text(periodo, (doc.internal.pageSize.width - periodoWidth) / 2, 50);
    doc.text(total, (doc.internal.pageSize.width - totalWidth) / 2, 60);
    
    // Configuração da tabela
    const tableColumn = ['Data', 'Nome', 'CPF', 'Solicitante'];
    const tableRows = atendimentos.map(atendimento => [
      formatDate(atendimento.dia_atual),
      atendimento.nome,
      atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
      atendimento.solicitante
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 70,
      styles: {
        fontSize: 8,
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 35 },
        3: { cellWidth: 50 }
      },
      alternateRowStyles: {
        fillColor: secondaryColor
      },
      margin: { top: 70, right: 10, bottom: 20, left: 10 }
    });

    // Adicionar rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      
      // Data e hora de geração
      const now = new Date();
      const dataHoraGeracao = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
      doc.text(dataHoraGeracao, 15, doc.internal.pageSize.height - 10);
      
      // Número da página
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getStringUnitWidth(pageText) * doc.getFontSize() / doc.internal.scaleFactor;
      doc.text(pageText, doc.internal.pageSize.width - 15 - pageTextWidth, doc.internal.pageSize.height - 10);
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
