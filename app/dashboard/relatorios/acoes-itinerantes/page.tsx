'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import {
  FiMapPin,
  FiTrendingUp,
  FiUsers,
  FiCalendar,
  FiArrowLeft,
  FiDownload,
  FiFilter,
  FiBarChart2,
  FiPieChart,
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiRefreshCw
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AcaoData {
  nome: string;
  total: number;
  concluidos: number;
  emAndamento: number;
  correcao: number;
  bloqueados: number;
  outros: number;
  percentualConclusao: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface TimelineData {
  data: string;
  atendimentos: number;
}

interface ChronologicalItem {
  data: string;
  acao: string;
  total: number;
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
  orange: '#F97316'
};

const STATUS_COLORS: Record<string, string> = {
  'Concluído': COLORS.success,
  'concluido': COLORS.success,
  'em_andamento': COLORS.primary,
  'Em Andamento': COLORS.primary,
  'correcao': COLORS.warning,
  'Correção': COLORS.warning,
  'bloqueado': COLORS.danger,
  'Bloqueado': COLORS.danger,
  'cancelado': '#6B7280',
  'Cancelado': '#6B7280',
  'Outros': '#6B7280',
  'outros': '#6B7280',
  'Não definido': '#9CA3AF'
};

export default function AcoesItinerantesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [acoes, setAcoes] = useState<AcaoData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [totalAtendimentos, setTotalAtendimentos] = useState(0);
  const [selectedAcao, setSelectedAcao] = useState<string | null>(null);
  const [chronologicalData, setChronologicalData] = useState<ChronologicalItem[]>([]);

  useEffect(() => {
    // Definir datas padrão: início das ações (01/07/2025) até hoje
    const hoje = new Date();
    const dataInicioAcoes = new Date('2025-07-01'); // Data de início das ações itinerantes

    setDataFim(hoje.toISOString().split('T')[0]);
    setDataInicio(dataInicioAcoes.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      fetchData();
    }
  }, [dataInicio, dataFim, selectedAcao]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar todos os atendimentos do período com paginação automática
      // O Supabase tem limite padrão de 1000 registros, então precisamos buscar em lotes
      console.log('=== BUSCA DE ATENDIMENTOS ===');
      console.log(`Período: ${dataInicio} a ${dataFim}`);

      let allAtendimentos: any[] = [];
      let page = 0;
      const pageSize = 1000; // Limite máximo do Supabase
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('atendimentos')
          .select('*')
          .gte('dia_atual', dataInicio)
          .lte('dia_atual', dataFim)
          .order('dia_atual', { ascending: false })
          .order('horario', { ascending: false })
          .range(from, to);

        const { data: atendimentos, error } = await query;

        if (error) throw error;

        if (atendimentos && atendimentos.length > 0) {
          allAtendimentos = [...allAtendimentos, ...atendimentos];
          console.log(`Página ${page + 1}: ${atendimentos.length} registros encontrados (Total acumulado: ${allAtendimentos.length})`);

          // Se retornou menos que o pageSize, não há mais registros
          if (atendimentos.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`Total de registros buscados: ${allAtendimentos.length}`);
      console.log('============================');

      const atendimentos = allAtendimentos;

      if (!atendimentos || atendimentos.length === 0) {
        setAcoes([]);
        setStatusData([]);
        setTimelineData([]);
        setTotalAtendimentos(0);
        return;
      }

      // Filtrar apenas atendimentos que são de ações (solicitante contém qualquer variação de "ação")
      // Usar busca case-insensitive e mais flexível para capturar todos os registros fieis da tabela
      console.log('=== FILTRAGEM DE AÇÕES ===');
      console.log(`Total de atendimentos no período: ${atendimentos.length}`);

      const atendimentosAcoes = atendimentos.filter((a: any) => {
        if (!a.solicitante) {
          return false;
        }
        // Normalizar o solicitante: remover espaços extras, converter para minúsculas e remover acentos
        const solicitante = a.solicitante.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Verificar se contém "acao" (sem acento após normalização) ou usar regex case-insensitive no original
        // Isso garante que captura: "AÇÃO", "ação", "acao", "Acao", "Ação Itinerante", etc.
        const isAcao = solicitante.includes('acao') || /acao|ação/i.test(a.solicitante.trim());
        return isAcao;
      });

      // Log detalhado para debug
      console.log(`Atendimentos de ações encontrados: ${atendimentosAcoes.length}`);

      // Verificar se há atendimentos sem solicitante que poderiam ser ações
      const atendimentosSemSolicitante = atendimentos.filter((a: any) => !a.solicitante);
      if (atendimentosSemSolicitante.length > 0) {
        console.warn(`Atenção: ${atendimentosSemSolicitante.length} atendimento(s) sem solicitante (não incluídos no relatório)`);
      }

      // Mostrar exemplos de solicitantes encontrados
      const solicitantesUnicos = [...new Set(atendimentosAcoes.map((a: any) => a.solicitante))];
      console.log(`Solicitantes únicos encontrados: ${solicitantesUnicos.length}`);
      if (solicitantesUnicos.length <= 10) {
        console.log('Exemplos de solicitantes:', solicitantesUnicos);
      } else {
        console.log('Primeiros 10 solicitantes:', solicitantesUnicos.slice(0, 10));
      }
      console.log('==========================');

      setTotalAtendimentos(atendimentosAcoes.length);

      // Processamento cronológico: Agrupar por data e solicitante
      const cronoMap = new Map<string, number>();

      atendimentosAcoes.forEach((at: any) => {
        const data = at.dia_atual || at.created_at?.split('T')[0];
        const nome = at.solicitante;

        if (data && nome) {
          // Chave composta para agrupar
          const key = `${data}|${nome}`;
          cronoMap.set(key, (cronoMap.get(key) || 0) + 1);
        }
      });

      // Converter mapa para array e ordenar
      const cronoArray: ChronologicalItem[] = Array.from(cronoMap.entries()).map(([key, total]) => {
        const [data, acao] = key.split('|');
        return { data, acao, total };
      }).sort((a, b) => {
        // Ordenar por data (crescente)
        const dateCompare = a.data.localeCompare(b.data);
        if (dateCompare !== 0) return dateCompare;
        // Se mesma data, ordenar por nome da ação
        return a.acao.localeCompare(b.acao);
      });

      console.log(`Itens cronológicos gerados: ${cronoArray.length}`);
      setChronologicalData(cronoArray);

      // Agrupar por ação
      console.log('=== AGRUPAMENTO POR AÇÃO ===');
      const acoesMap = new Map<string, AcaoData>();
      const statusEncontrados = new Set<string>();

      atendimentosAcoes.forEach((atendimento: any) => {
        const nomeAcao = atendimento.solicitante;

        // Coletar todos os status únicos para análise
        if (atendimento.status) {
          statusEncontrados.add(String(atendimento.status).trim());
        }

        if (!acoesMap.has(nomeAcao)) {
          acoesMap.set(nomeAcao, {
            nome: nomeAcao,
            total: 0,
            concluidos: 0,
            emAndamento: 0,
            correcao: 0,
            bloqueados: 0,
            outros: 0,
            percentualConclusao: 0
          });
        }

        const acao = acoesMap.get(nomeAcao)!;
        acao.total++;

        // Normalizar status para comparação (remover acentos e converter para minúsculas)
        // Tratar casos de null, undefined, empty string
        const statusRaw = atendimento.status;
        const status = (statusRaw === null || statusRaw === undefined || statusRaw === '')
          ? ''
          : String(statusRaw).trim();

        const statusLower = status.toLowerCase();
        const statusNormalizado = statusLower
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/\s+/g, ' '); // Normaliza espaços múltiplos

        // Verificar todas as variações de status - usar if separados para garantir contagem correta
        // IMPORTANTE: Cada atendimento deve ser contado em apenas uma categoria
        let statusContado = false;

        // Concluído - todas as variações possíveis
        if (!statusContado && (
          statusNormalizado.includes('concluido') ||
          statusLower.includes('concluído') ||
          statusLower === 'concluido' ||
          statusLower === 'concluído' ||
          statusNormalizado === 'concluido' ||
          status === 'Concluído' ||
          status === 'Concluido' ||
          status === 'CONCLUÍDO' ||
          status === 'CONCLUIDO'
        )) {
          acao.concluidos++;
          statusContado = true;
        }

        // Em Andamento - todas as variações possíveis
        if (!statusContado && (
          statusNormalizado.includes('em_andamento') ||
          statusNormalizado.includes('em andamento') ||
          statusLower.includes('em andamento') ||
          statusLower === 'em andamento' ||
          statusLower === 'em_andamento' ||
          status === 'Em Andamento' ||
          status === 'Em andamento' ||
          status === 'EM ANDAMENTO' ||
          status === 'em_andamento'
        )) {
          acao.emAndamento++;
          statusContado = true;
        }

        // Correção - todas as variações possíveis
        if (!statusContado && (
          statusNormalizado.includes('correcao') ||
          statusLower.includes('correção') ||
          statusLower === 'correcao' ||
          statusLower === 'correção' ||
          statusNormalizado === 'correcao' ||
          status === 'Correção' ||
          status === 'Correcao' ||
          status === 'CORREÇÃO' ||
          status === 'CORRECAO'
        )) {
          acao.correcao++;
          statusContado = true;
        }

        // Bloqueado - todas as variações possíveis
        if (!statusContado && (
          statusNormalizado.includes('bloqueado') ||
          statusLower === 'bloqueado' ||
          status === 'Bloqueado' ||
          status === 'BLOQUEADO'
        )) {
          acao.bloqueados++;
          statusContado = true;
        }

        // Cancelado - adicionar também como categoria separada ou em Outros
        if (!statusContado && (
          statusNormalizado.includes('cancelado') ||
          statusLower === 'cancelado' ||
          status === 'Cancelado' ||
          status === 'CANCELADO'
        )) {
          // Cancelados vão para "Outros" por enquanto, mas são contados
          acao.outros++;
          statusContado = true;
          console.warn(`Status "Cancelado" encontrado para ação "${nomeAcao}" - adicionado em "Outros"`);
        }

        // Se não foi contado em nenhuma categoria (incluindo status vazio/null), adicionar à categoria "Outros"
        if (!statusContado) {
          acao.outros++;
          if (status) {
            console.warn(`Status não mapeado encontrado: "${status}" (original: "${statusRaw}") para ação "${nomeAcao}" - adicionado em "Outros"`);
          } else {
            console.warn(`Status vazio/null encontrado para ação "${nomeAcao}" - adicionado em "Outros"`);
          }
        }
      });

      // Log de status únicos encontrados
      console.log(`Status únicos encontrados nos atendimentos: ${statusEncontrados.size}`);
      if (statusEncontrados.size > 0) {
        console.log('Lista de status:', Array.from(statusEncontrados).sort());
      }
      console.log('============================');

      // Calcular percentuais e ordenar com validação rigorosa
      const acoesArray = Array.from(acoesMap.values()).map(acao => {
        // Validar que a soma dos status seja igual ao total
        const somaStatus = acao.concluidos + acao.emAndamento + acao.correcao + acao.bloqueados + acao.outros;

        // Se houver discrepância, corrigir automaticamente ajustando "Outros"
        if (somaStatus !== acao.total) {
          const diferenca = acao.total - somaStatus;
          console.error(`ERRO: Discrepância na ação "${acao.nome}": Total=${acao.total}, Soma Status=${somaStatus}, Diferença=${diferenca}`);

          // Corrigir automaticamente: ajustar "Outros" para compensar a diferença
          if (diferenca > 0) {
            // Faltam atendimentos contados - adicionar em "Outros"
            acao.outros += diferenca;
            console.warn(`Correção automática: Adicionados ${diferenca} atendimento(s) em "Outros" para ação "${acao.nome}"`);
          } else if (diferenca < 0) {
            // Há atendimentos contados a mais - remover de "Outros" se possível
            const ajuste = Math.min(Math.abs(diferenca), acao.outros);
            acao.outros -= ajuste;
            console.warn(`Correção automática: Removidos ${ajuste} atendimento(s) de "Outros" para ação "${acao.nome}"`);
          }
        }

        // Validação final após correção
        const somaFinal = acao.concluidos + acao.emAndamento + acao.correcao + acao.bloqueados + acao.outros;
        if (somaFinal !== acao.total) {
          console.error(`ERRO CRÍTICO: Ainda há discrepância após correção na ação "${acao.nome}": Total=${acao.total}, Soma Final=${somaFinal}`);
        }

        return {
          ...acao,
          percentualConclusao: acao.total > 0 ? (acao.concluidos / acao.total) * 100 : 0
        };
      }).sort((a, b) => b.total - a.total);

      setAcoes(acoesArray);

      // Validação rigorosa final - verificar totais
      const totalGeral = acoesArray.reduce((sum, acao) => sum + acao.total, 0);
      const somaStatusGeral = acoesArray.reduce((sum, acao) =>
        sum + acao.concluidos + acao.emAndamento + acao.correcao + acao.bloqueados + acao.outros, 0
      );

      // Logs detalhados para debug
      console.log('=== VALIDAÇÃO DE DADOS ===');
      console.log(`Total de atendimentos no período: ${atendimentos.length}`);
      console.log(`Atendimentos de ações encontrados: ${atendimentosAcoes.length}`);
      console.log(`Total geral de atendimentos por ação: ${totalGeral}`);
      console.log(`Soma geral de status: ${somaStatusGeral}`);
      console.log(`Número de ações distintas: ${acoesArray.length}`);

      // Verificar se todos os atendimentos foram agrupados
      if (totalGeral !== atendimentosAcoes.length) {
        console.error(`ERRO: Total geral (${totalGeral}) não corresponde ao número de atendimentos filtrados (${atendimentosAcoes.length})`);
        console.error(`Diferença: ${Math.abs(totalGeral - atendimentosAcoes.length)} atendimento(s)`);
      }

      // Verificar se a soma dos status bate com o total
      if (totalGeral !== somaStatusGeral) {
        console.error(`ERRO: Total geral (${totalGeral}) não corresponde à soma de status (${somaStatusGeral})`);
        console.error(`Diferença: ${Math.abs(totalGeral - somaStatusGeral)} atendimento(s)`);

        // Tentar identificar qual ação tem problema
        acoesArray.forEach(acao => {
          const somaAcao = acao.concluidos + acao.emAndamento + acao.correcao + acao.bloqueados + acao.outros;
          if (somaAcao !== acao.total) {
            console.error(`  - Ação "${acao.nome}": Total=${acao.total}, Soma=${somaAcao}, Diferença=${acao.total - somaAcao}`);
          }
        });
      } else {
        console.log('✓ Validação passou: Total geral corresponde à soma de status');
      }

      // Estatísticas por status
      const statsPorStatus = {
        concluidos: acoesArray.reduce((sum, acao) => sum + acao.concluidos, 0),
        emAndamento: acoesArray.reduce((sum, acao) => sum + acao.emAndamento, 0),
        correcao: acoesArray.reduce((sum, acao) => sum + acao.correcao, 0),
        bloqueados: acoesArray.reduce((sum, acao) => sum + acao.bloqueados, 0),
        outros: acoesArray.reduce((sum, acao) => sum + acao.outros, 0)
      };
      console.log('Estatísticas por status:', statsPorStatus);
      console.log('========================');

      // Dados para gráfico de status (consolidado ou por ação)
      // Usar a mesma lógica de categorização da tabela para garantir consistência
      const acoesFiltradas = selectedAcao
        ? acoesArray.filter(acao => acao.nome === selectedAcao)
        : acoesArray;

      // Agregar os dados das ações filtradas
      const statusAgregado = {
        'Concluídos': 0,
        'Em Andamento': 0,
        'Correção': 0,
        'Bloqueados': 0,
        'Outros': 0
      };

      acoesFiltradas.forEach(acao => {
        statusAgregado['Concluídos'] += acao.concluidos;
        statusAgregado['Em Andamento'] += acao.emAndamento;
        statusAgregado['Correção'] += acao.correcao;
        statusAgregado['Bloqueados'] += acao.bloqueados;
        statusAgregado['Outros'] += acao.outros;
      });

      const statusArray: StatusData[] = Object.entries(statusAgregado)
        .filter(([_, value]) => value > 0) // Remover categorias com zero
        .map(([name, value]) => ({
          name,
          value,
          color: STATUS_COLORS[name] || '#6B7280'
        }));

      setStatusData(statusArray);

      // Log detalhado para gráfico de status
      console.log('=== GRÁFICO DE STATUS ===');
      const totalStatusGrafico = statusArray.reduce((sum, item) => sum + item.value, 0);
      const totalAcoesFiltradas = acoesFiltradas.reduce((sum, acao) => sum + acao.total, 0);
      console.log(`Total no gráfico: ${totalStatusGrafico}`);
      console.log(`Total de ações filtradas: ${totalAcoesFiltradas}`);
      console.log('Distribuição:', statusArray.map(s => `${s.name}: ${s.value}`).join(', '));

      if (totalStatusGrafico !== totalAcoesFiltradas) {
        console.error(`ERRO no gráfico: Total (${totalStatusGrafico}) não corresponde ao total de ações (${totalAcoesFiltradas})`);
      } else {
        console.log('✓ Gráfico validado corretamente');
      }
      console.log('==========================');

      // Dados para timeline (atendimentos por dia)
      const atendimentosParaTimeline = selectedAcao
        ? atendimentosAcoes.filter((a: any) => a.solicitante === selectedAcao)
        : atendimentosAcoes;

      const timelineMap = new Map<string, number>();
      atendimentosParaTimeline.forEach((atendimento: any) => {
        const data = atendimento.dia_atual || atendimento.created_at?.split('T')[0];
        if (data) {
          timelineMap.set(data, (timelineMap.get(data) || 0) + 1);
        }
      });

      const timelineArray: TimelineData[] = Array.from(timelineMap.entries())
        .map(([data, atendimentos]) => ({ data, atendimentos }))
        .sort((a, b) => a.data.localeCompare(b.data));

      setTimelineData(timelineArray);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text('Relatório de Ações Itinerantes ALECE', 14, 20);

    // Período
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`, 14, 30);
    doc.text(`Total de Atendimentos: ${totalAtendimentos}`, 14, 38);

    // Tabela de ações
    const tableData = acoes.map(acao => [
      acao.nome,
      acao.total.toString(),
      acao.concluidos.toString(),
      acao.emAndamento.toString(),
      acao.correcao.toString(),
      acao.bloqueados.toString(),
      acao.outros.toString(),
      `${acao.percentualConclusao.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Ação', 'Total', 'Concluídos', 'Em Andamento', 'Correção', 'Bloqueados', 'Outros', '% Conclusão']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 }
    });

    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(10);
    doc.setTextColor(100);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(
        `Gerado em ${new Date().toLocaleString('pt-BR')}`,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(`acoes-itinerantes-${dataInicio}-${dataFim}.pdf`);
  };

  const generateChronologicalPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text('Cronograma de Ações Itinerantes', pageWidth / 2, 20, { align: 'center' });

    // Subtitle / Period
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(
      `Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`,
      pageWidth / 2,
      28,
      { align: 'center' }
    );

    // Table Data
    const formattedData = chronologicalData.map(item => [
      new Date(item.data).toLocaleDateString('pt-BR'),
      item.acao,
      item.total.toString()
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Ação', 'Quantidade']],
      body: formattedData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 }, // Data
        1: { halign: 'left' }, // Ação
        2: { halign: 'center', cellWidth: 30 }  // Quantidade
      },
      styles: { fontSize: 10, cellPadding: 3 },
      didDrawPage: (data: any) => {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
          `Página ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        doc.text(
          `Gerado em ${new Date().toLocaleString('pt-BR')}`,
          14,
          doc.internal.pageSize.getHeight() - 10
        );
      }
    });

    doc.save(`acoes-itinerantes-cronologica-${dataInicio}-${dataFim}.pdf`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border-2 border-blue-200">
          <p className="font-bold text-slate-800">{payload[0].payload.nome || payload[0].name}</p>
          <p className="text-sm text-slate-600 mt-1">
            {payload[0].name}: <span className="font-bold text-blue-600">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <FiRefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-700">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="group flex items-center text-slate-600 hover:text-blue-600 transition-all duration-200 mb-6"
          >
            <FiArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl">
                  <FiMapPin className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Ações Itinerantes ALECE
                </h1>
              </div>
              <p className="text-lg text-slate-600 ml-14">
                Análise de atendimentos por ação itinerante
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={generateChronologicalPDF}
                className="group flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <FiClock className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                Lista Cronológica
              </button>

              <button
                onClick={generatePDF}
                className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <FiDownload className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-200" />
                Exportar PDF
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-3xl shadow-xl border-4 border-blue-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FiFilter className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Filtrar por Ação
              </label>
              <select
                value={selectedAcao || ''}
                onChange={(e) => setSelectedAcao(e.target.value || null)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
              >
                <option value="">Todas as Ações</option>
                {acoes.map(acao => (
                  <option key={acao.nome} value={acao.nome}>{acao.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <FiActivity className="w-8 h-8" />
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <FiBarChart2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Total de Ações</p>
            <p className="text-4xl font-black">{acoes.length}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <FiUsers className="w-8 h-8" />
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <FiTrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Total de Atendimentos</p>
            <p className="text-4xl font-black">{totalAtendimentos}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <FiCheckCircle className="w-8 h-8" />
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <FiActivity className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Concluídos</p>
            <p className="text-4xl font-black">
              {acoes.reduce((sum, acao) => sum + acao.concluidos, 0)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <FiClock className="w-8 h-8" />
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <FiPieChart className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Em Andamento</p>
            <p className="text-4xl font-black">
              {acoes.reduce((sum, acao) => sum + acao.emAndamento, 0)}
            </p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gráfico de Barras - Atendimentos por Ação */}
          <div className="bg-white rounded-3xl shadow-xl border-4 border-blue-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <FiBarChart2 className="w-6 h-6 text-blue-600" />
              <h3 className="text-2xl font-bold text-slate-800">Atendimentos por Ação</h3>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={acoes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="nome"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="total" fill={COLORS.primary} name="Total" radius={[8, 8, 0, 0]} />
                <Bar dataKey="concluidos" fill={COLORS.success} name="Concluídos" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Pizza - Distribuição de Status */}
          <div className="bg-white rounded-3xl shadow-xl border-4 border-purple-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <FiPieChart className="w-6 h-6 text-purple-600" />
              <h3 className="text-2xl font-bold text-slate-800">
                Distribuição de Status {selectedAcao && `- ${selectedAcao}`}
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={statusData as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Linha - Timeline */}
        {timelineData.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl border-4 border-pink-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FiCalendar className="w-6 h-6 text-pink-600" />
              <h3 className="text-2xl font-bold text-slate-800">
                Evolução de Atendimentos ao Longo do Tempo
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  content={<CustomTooltip />}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="atendimentos"
                  stroke={COLORS.pink}
                  strokeWidth={3}
                  name="Atendimentos"
                  dot={{ fill: COLORS.pink, r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela de Ações */}
        <div className="bg-white rounded-3xl shadow-xl border-4 border-green-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FiMapPin className="w-6 h-6 text-green-600" />
            <h3 className="text-2xl font-bold text-slate-800">Detalhamento por Ação</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-blue-200">
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Ação</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Total</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Concluídos</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Em Andamento</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Correção</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Bloqueados</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Outros</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">% Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {acoes.map((acao, index) => (
                  <tr
                    key={acao.nome}
                    className={`border-b border-slate-100 hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{acao.nome}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                        {acao.total}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                        {acao.concluidos}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-700">
                        {acao.emAndamento}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-700">
                        {acao.correcao}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                        {acao.bloqueados}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-700">
                        {acao.outros}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${acao.percentualConclusao}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-700">
                          {acao.percentualConclusao.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {acoes.length === 0 && (
            <div className="text-center py-12">
              <FiAlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-lg text-slate-500 font-medium">
                Nenhuma ação encontrada no período selecionado
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Ajuste os filtros para visualizar os dados
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
