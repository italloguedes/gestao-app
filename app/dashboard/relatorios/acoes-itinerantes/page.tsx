'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
  FiRefreshCw,
  FiFileText,
  FiList,
  FiX,
  FiUser,
  FiCopy,
  FiCheck
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
  dataInicio: string;
  dataFim: string;
  acao: string;
  total: number;
}

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}`;
};

const formatDateFull = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

// Updated color palette — emerald / teal / green tones
const COLORS = {
  primary: '#059669',   // emerald-600
  success: '#10B981',   // emerald-500
  warning: '#F59E0B',
  danger: '#EF4444',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  amber: '#D97706',
  gray: '#6B7280'
};

const STATUS_COLORS: Record<string, string> = {
  'Concluído': COLORS.success,
  'concluido': COLORS.success,
  'Concluídos': COLORS.success,
  'em_andamento': COLORS.teal,
  'Em Andamento': COLORS.teal,
  'correcao': COLORS.warning,
  'Correção': COLORS.warning,
  'bloqueado': COLORS.danger,
  'Bloqueado': COLORS.danger,
  'Bloqueados': COLORS.danger,
  'cancelado': '#6B7280',
  'Cancelado': '#6B7280',
  'Outros': '#6B7280',
  'outros': '#6B7280',
  'Não definido': '#9CA3AF'
};

export default function AcoesItinerantesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [acoes, setAcoes] = useState<AcaoData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [totalAtendimentos, setTotalAtendimentos] = useState(0);
  const [selectedAcao, setSelectedAcao] = useState<string | null>(null);
  const [chronologicalData, setChronologicalData] = useState<ChronologicalItem[]>([]);
  const [rawAtendimentosAcoes, setRawAtendimentosAcoes] = useState<any[]>([]);
  const [expandedEmAndamento, setExpandedEmAndamento] = useState<string | null>(null);
  const [expandedCancelados, setExpandedCancelados] = useState<string | null>(null);
  const [copiedCpf, setCopiedCpf] = useState<string | null>(null);
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

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  const popoverCanceladosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setExpandedEmAndamento(null);
      }
      if (popoverCanceladosRef.current && !popoverCanceladosRef.current.contains(event.target as Node)) {
        setExpandedCancelados(null);
      }
    };
    if (expandedEmAndamento || expandedCancelados) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandedEmAndamento, expandedCancelados]);

  useEffect(() => {
    const hoje = new Date();
    const dataInicioAcoes = new Date('2025-06-01');
    setDataFim(hoje.toISOString().split('T')[0]);
    setDataInicio(dataInicioAcoes.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      fetchData();
    }
  }, [dataInicio, dataFim, selectedAcao]);

  // =============================================
  // BUSINESS LOGIC — preserved exactly as original
  // =============================================

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('=== BUSCA DE ATENDIMENTOS ===');
      console.log(`Período: ${dataInicio} a ${dataFim}`);

      let allAtendimentos: any[] = [];
      let page = 0;
      const pageSize = 1000;
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

      console.log('=== FILTRAGEM DE AÇÕES ===');
      console.log(`Total de atendimentos no período: ${atendimentos.length}`);

      const atendimentosAcoes = atendimentos.filter((a: any) => {
        if (!a.solicitante) return false;
        const solicitante = a.solicitante.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const isAcao = solicitante.startsWith('acao') || /^a[çc][ãa]o/i.test(a.solicitante.trim());
        return isAcao;
      });

      console.log(`Atendimentos de ações encontrados: ${atendimentosAcoes.length}`);

      const atendimentosSemSolicitante = atendimentos.filter((a: any) => !a.solicitante);
      if (atendimentosSemSolicitante.length > 0) {
        console.warn(`Atenção: ${atendimentosSemSolicitante.length} atendimento(s) sem solicitante (não incluídos no relatório)`);
      }

      const solicitantesUnicos = [...new Set(atendimentosAcoes.map((a: any) => a.solicitante))];
      console.log(`Solicitantes únicos encontrados: ${solicitantesUnicos.length}`);
      if (solicitantesUnicos.length <= 10) {
        console.log('Exemplos de solicitantes:', solicitantesUnicos);
      } else {
        console.log('Primeiros 10 solicitantes:', solicitantesUnicos.slice(0, 10));
      }
      console.log('==========================');

      setTotalAtendimentos(atendimentosAcoes.length);
      setRawAtendimentosAcoes(atendimentosAcoes);

      // Chronological processing
      const cronoMap = new Map<string, { dataInicio: string; dataFim: string; total: number }>();

      atendimentosAcoes.forEach((at: any) => {
        const data = at.dia_atual || at.created_at?.split('T')[0];
        const nome = at.solicitante;

        if (data && nome) {
          if (!cronoMap.has(nome)) {
            cronoMap.set(nome, { dataInicio: data, dataFim: data, total: 1 });
          } else {
            const existing = cronoMap.get(nome)!;
            existing.total++;
            if (data < existing.dataInicio) existing.dataInicio = data;
            if (data > existing.dataFim) existing.dataFim = data;
          }
        }
      });

      const cronoArray: ChronologicalItem[] = Array.from(cronoMap.entries()).map(([acao, dados]) => ({
        acao,
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim,
        total: dados.total
      })).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

      console.log(`Itens cronológicos gerados: ${cronoArray.length}`);
      setChronologicalData(cronoArray);

      // Group by action
      console.log('=== AGRUPAMENTO POR AÇÃO ===');
      const acoesMap = new Map<string, AcaoData>();
      const statusEncontrados = new Set<string>();

      atendimentosAcoes.forEach((atendimento: any) => {
        const nomeAcao = atendimento.solicitante;

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

        const statusRaw = atendimento.status;
        const status = (statusRaw === null || statusRaw === undefined || statusRaw === '')
          ? ''
          : String(statusRaw).trim();

        const statusLower = status.toLowerCase();
        const statusNormalizado = statusLower
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ');

        let statusContado = false;

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

        if (!statusContado && (
          statusNormalizado.includes('bloqueado') ||
          statusLower === 'bloqueado' ||
          status === 'Bloqueado' ||
          status === 'BLOQUEADO'
        )) {
          acao.bloqueados++;
          statusContado = true;
        }

        if (!statusContado && (
          statusNormalizado.includes('cancelado') ||
          statusLower === 'cancelado' ||
          status === 'Cancelado' ||
          status === 'CANCELADO'
        )) {
          acao.outros++;
          statusContado = true;
          console.warn(`Status "Cancelado" encontrado para ação "${nomeAcao}" - adicionado em "Outros"`);
        }

        if (!statusContado) {
          acao.outros++;
          if (status) {
            console.warn(`Status não mapeado encontrado: "${status}" (original: "${statusRaw}") para ação "${nomeAcao}" - adicionado em "Outros"`);
          } else {
            console.warn(`Status vazio/null encontrado para ação "${nomeAcao}" - adicionado em "Outros"`);
          }
        }
      });

      console.log(`Status únicos encontrados nos atendimentos: ${statusEncontrados.size}`);
      if (statusEncontrados.size > 0) {
        console.log('Lista de status:', Array.from(statusEncontrados).sort());
      }
      console.log('============================');

      const acoesArray = Array.from(acoesMap.values()).map(acao => {
        const somaStatus = acao.concluidos + acao.emAndamento + acao.correcao + acao.bloqueados + acao.outros;

        if (somaStatus !== acao.total) {
          const diferenca = acao.total - somaStatus;
          console.error(`ERRO: Discrepância na ação "${acao.nome}": Total=${acao.total}, Soma Status=${somaStatus}, Diferença=${diferenca}`);

          if (diferenca > 0) {
            acao.outros += diferenca;
            console.warn(`Correção automática: Adicionados ${diferenca} atendimento(s) em "Outros" para ação "${acao.nome}"`);
          } else if (diferenca < 0) {
            const ajuste = Math.min(Math.abs(diferenca), acao.outros);
            acao.outros -= ajuste;
            console.warn(`Correção automática: Removidos ${ajuste} atendimento(s) de "Outros" para ação "${acao.nome}"`);
          }
        }

        const somaFinal = acao.concluidos + acao.emAndamento + acao.correcao + acao.bloqueados + acao.outros;
        if (somaFinal !== acao.total) {
          console.error(`ERRO CRÍTICO: Ainda há discrepância após correção na ação "${acao.nome}": Total=${acao.total}, Soma Final=${somaFinal}`);
        }

        return {
          ...acao,
          percentualConclusao: acao.total > 0 ? (acao.concluidos / acao.total) * 100 : 0
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setAcoes(acoesArray);

      const totalGeral = acoesArray.reduce((sum, acao) => sum + acao.total, 0);
      const somaStatusGeral = acoesArray.reduce((sum, acao) =>
        sum + acao.concluidos + acao.emAndamento + acao.correcao + acao.bloqueados + acao.outros, 0
      );

      console.log('=== VALIDAÇÃO DE DADOS ===');
      console.log(`Total de atendimentos no período: ${atendimentos.length}`);
      console.log(`Atendimentos de ações encontrados: ${atendimentosAcoes.length}`);
      console.log(`Total geral de atendimentos por ação: ${totalGeral}`);
      console.log(`Soma geral de status: ${somaStatusGeral}`);
      console.log(`Número de ações distintas: ${acoesArray.length}`);

      if (totalGeral !== atendimentosAcoes.length) {
        console.error(`ERRO: Total geral (${totalGeral}) não corresponde ao número de atendimentos filtrados (${atendimentosAcoes.length})`);
        console.error(`Diferença: ${Math.abs(totalGeral - atendimentosAcoes.length)} atendimento(s)`);
      }

      if (totalGeral !== somaStatusGeral) {
        console.error(`ERRO: Total geral (${totalGeral}) não corresponde à soma de status (${somaStatusGeral})`);
        console.error(`Diferença: ${Math.abs(totalGeral - somaStatusGeral)} atendimento(s)`);
        acoesArray.forEach(acao => {
          const somaAcao = acao.concluidos + acao.emAndamento + acao.correcao + acao.bloqueados + acao.outros;
          if (somaAcao !== acao.total) {
            console.error(`  - Ação "${acao.nome}": Total=${acao.total}, Soma=${somaAcao}, Diferença=${acao.total - somaAcao}`);
          }
        });
      } else {
        console.log('✓ Validação passou: Total geral corresponde à soma de status');
      }

      const statsPorStatus = {
        concluidos: acoesArray.reduce((sum, acao) => sum + acao.concluidos, 0),
        emAndamento: acoesArray.reduce((sum, acao) => sum + acao.emAndamento, 0),
        correcao: acoesArray.reduce((sum, acao) => sum + acao.correcao, 0),
        bloqueados: acoesArray.reduce((sum, acao) => sum + acao.bloqueados, 0),
        outros: acoesArray.reduce((sum, acao) => sum + acao.outros, 0)
      };
      console.log('Estatísticas por status:', statsPorStatus);
      console.log('========================');

      const acoesFiltradas = selectedAcao
        ? acoesArray.filter(acao => acao.nome === selectedAcao)
        : acoesArray;

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
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
          color: STATUS_COLORS[name] || '#6B7280'
        }));

      setStatusData(statusArray);

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

  // =============================================
  // PDF GENERATORS — updated colors to green
  // =============================================

  const generatePDF = () => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [0, 135, 81]; // Verde ALECE
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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
    const title = 'RELATÓRIO DE AÇÕES ITINERANTES';
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
    const periodoText = `Período: ${formatDateFull(dataInicio)} a ${formatDateFull(dataFim)}`;
    const totalText = `Total Atendimentos: ${totalAtendimentos}`;
    const infoText = `${periodoText}  |  ${totalText}`;
    const infoWidth = doc.getStringUnitWidth(infoText) * 9 / doc.internal.scaleFactor;
    const infoX = logoBase64 ? 52 + (pageWidth - 52 - infoWidth) / 2 : (pageWidth - infoWidth) / 2;
    doc.text(infoText, infoX, 32);

    const tableData = acoes.map(acao => {
      const crono = chronologicalData.find(c => c.acao === acao.nome);
      const periodo = crono
        ? (crono.dataInicio === crono.dataFim
          ? formatDateFull(crono.dataInicio)
          : `${formatDateFull(crono.dataInicio)} a ${formatDateFull(crono.dataFim)}`)
        : '—';

      return [
        acao.nome,
        periodo,
        acao.total.toString(),
        acao.concluidos.toString(),
        acao.emAndamento.toString(),
        acao.outros.toString(),
        `${acao.percentualConclusao.toFixed(1)}%`
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['Ação', 'Período', 'Total', 'Concluídos', 'Em Andamento', 'Cancelados', '% Conclusão']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor },
      styles: { fontSize: 7 },
      margin: { top: 20, left: 14, right: 14, bottom: 25 },
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
        doc.text('RELATÓRIO DE AÇÕES ITINERANTES', logoBase64 ? 24 : 15, 11);

        // Período no canto direito
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const headerPeriodo = `${formatDateFull(dataInicio)} a ${formatDateFull(dataFim)}`;
        const headerPeriodoWidth = doc.getStringUnitWidth(headerPeriodo) * 7 / doc.internal.scaleFactor;
        doc.text(headerPeriodo, pageWidth - 14 - headerPeriodoWidth, 11);
      }

      // Rodapé
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 110, 110);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, pageHeight - 12);

      const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Usuário';
      const userText = `Gerado por: ${userName}`;
      const userTextWidth = doc.getStringUnitWidth(userText) * 7 / doc.internal.scaleFactor;
      doc.text(userText, (pageWidth - userTextWidth) / 2, pageHeight - 12);

      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getStringUnitWidth(pageText) * 7 / doc.internal.scaleFactor;
      doc.text(pageText, pageWidth - 14 - pageTextWidth, pageHeight - 12);
    }

    doc.save(`acoes-itinerantes-${dataInicio}-${dataFim}.pdf`);
  };

  const generateChronologicalPDF = () => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [0, 135, 81]; // Verde ALECE
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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
    const title = 'CRONOGRAMA DE AÇÕES ITINERANTES';
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

    // Período
    doc.setFontSize(9);
    const periodoText = `Período: ${formatDateFull(dataInicio)} a ${formatDateFull(dataFim)}`;
    const infoWidth = doc.getStringUnitWidth(periodoText) * 9 / doc.internal.scaleFactor;
    const infoX = logoBase64 ? 52 + (pageWidth - 52 - infoWidth) / 2 : (pageWidth - infoWidth) / 2;
    doc.text(periodoText, infoX, 32);

    const formattedData = chronologicalData.map(item => {
      const dataInicioFormatted = formatDateFull(item.dataInicio);
      const dataFimFormatted = formatDateFull(item.dataFim);
      const periodo = item.dataInicio === item.dataFim
        ? dataInicioFormatted
        : `${dataInicioFormatted} até ${dataFimFormatted}`;

      return [item.acao, periodo, item.total.toString()];
    });

    autoTable(doc, {
      startY: 48,
      head: [['Ação', 'Período', 'Quantidade']],
      body: formattedData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, halign: 'center' },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center', cellWidth: 50 },
        2: { halign: 'center', cellWidth: 25 }
      },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { top: 20, left: 14, right: 14, bottom: 25 },
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
        doc.text('CRONOGRAMA DE AÇÕES ITINERANTES', logoBase64 ? 24 : 15, 11);

        // Período no canto direito
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const headerPeriodo = `${formatDateFull(dataInicio)} a ${formatDateFull(dataFim)}`;
        const headerPeriodoWidth = doc.getStringUnitWidth(headerPeriodo) * 7 / doc.internal.scaleFactor;
        doc.text(headerPeriodo, pageWidth - 14 - headerPeriodoWidth, 11);
      }

      // Rodapé
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 110, 110);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, pageHeight - 12);

      const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Usuário';
      const userText = `Gerado por: ${userName}`;
      const userTextWidth = doc.getStringUnitWidth(userText) * 7 / doc.internal.scaleFactor;
      doc.text(userText, (pageWidth - userTextWidth) / 2, pageHeight - 12);

      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getStringUnitWidth(pageText) * 7 / doc.internal.scaleFactor;
      doc.text(pageText, pageWidth - 14 - pageTextWidth, pageHeight - 12);
    }

    doc.save(`acoes-itinerantes-cronologica-${dataInicio}-${dataFim}.pdf`);
  };

  // =============================================
  // PER-ACTION PDF GENERATORS
  // =============================================

  const generateActionDetailPDF = (nomeAcao: string) => {
    const atendimentos = rawAtendimentosAcoes
      .filter((a: any) => a.solicitante === nomeAcao)
      .sort((a: any, b: any) => {
        const dateCompare = (a.dia_atual || '').localeCompare(b.dia_atual || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.horario || '').localeCompare(b.horario || '');
      });

    if (atendimentos.length === 0) {
      alert('Nenhum atendimento encontrado para esta ação.');
      return;
    }

    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [0, 135, 81];
    const secondaryColor: [number, number, number] = [248, 249, 250];

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const tableWidth = 150;
    const marginLeft = (pageWidth - tableWidth) / 2;

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
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const title = 'RELATÓRIO DE ATENDIMENTOS';
    const titleWidth = doc.getStringUnitWidth(title) * 14 / doc.internal.scaleFactor;
    const titleX = logoBase64 ? 52 + (pageWidth - 52 - titleWidth) / 2 : (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, 12);

    // Subtítulo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const subtitle = 'Assembleia Legislativa do Estado do Ceará';
    const subtitleWidth = doc.getStringUnitWidth(subtitle) * 10 / doc.internal.scaleFactor;
    const subtitleX = logoBase64 ? 52 + (pageWidth - 52 - subtitleWidth) / 2 : (pageWidth - subtitleWidth) / 2;
    doc.text(subtitle, subtitleX, 19);

    // Box de informações da ação e período
    const crono = chronologicalData.find(c => c.acao === nomeAcao);
    const periodoAcao = crono
      ? (crono.dataInicio === crono.dataFim
        ? formatDateFull(crono.dataInicio)
        : `${formatDateFull(crono.dataInicio)} a ${formatDateFull(crono.dataFim)}`)
      : `${formatDateFull(dataInicio)} a ${formatDateFull(dataFim)}`;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const actionText = `Ação: ${nomeAcao}`;
    const actionWidth = doc.getStringUnitWidth(actionText) * 9 / doc.internal.scaleFactor;
    const actionX = logoBase64 ? 52 + (pageWidth - 52 - actionWidth) / 2 : (pageWidth - actionWidth) / 2;
    doc.text(actionText, actionX, 27);

    doc.setFont('helvetica', 'normal');
    const infoText = `Período: ${periodoAcao}  |  Total: ${atendimentos.length}`;
    const infoWidth = doc.getStringUnitWidth(infoText) * 9 / doc.internal.scaleFactor;
    const infoX = logoBase64 ? 52 + (pageWidth - 52 - infoWidth) / 2 : (pageWidth - infoWidth) / 2;
    doc.text(infoText, infoX, 35);

    // Table
    const tableColumn = ['Data', 'Nome', 'CPF', 'Status'];
    const tableRows = atendimentos.map((at: any) => [
      formatDateFull(at.dia_atual),
      at.nome && at.nome.length > 40 ? at.nome.substring(0, 37) + '...' : (at.nome || '—'),
      at.cpf ? at.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—',
      at.status ? at.status.charAt(0).toUpperCase() + at.status.slice(1).toLowerCase() : '—'
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
        overflow: 'linebreak',
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
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 65, halign: 'left' },
        2: { cellWidth: 32, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: secondaryColor
      },
      margin: { top: 20, left: marginLeft, right: marginLeft, bottom: 25 },
      rowPageBreak: 'avoid',
      showHead: 'everyPage'
    });

    // --- PÓS-PROCESSAMENTO: RODAPÉ E HEADER PÁGINAS 2+ ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    const lineStartX = (pageWidth - 170) / 2;
    const lineWidth = 170;

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

        // Período no canto direito
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const headerPeriodoWidth = doc.getStringUnitWidth(periodoAcao) * 7 / doc.internal.scaleFactor;
        doc.text(periodoAcao, pageWidth - 14 - headerPeriodoWidth, 11);
      }

      // Rodapé
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(lineStartX, pageHeight - 15, lineStartX + lineWidth, pageHeight - 15);

      const now = new Date();
      doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, marginLeft, pageHeight - 8);

      const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Usuário';
      const atendenteText = `Gerado por: ${userName}`;
      const atendenteTextWidth = doc.getStringUnitWidth(atendenteText) * 7 / doc.internal.scaleFactor;
      doc.text(atendenteText, (pageWidth - atendenteTextWidth) / 2, pageHeight - 8);

      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getStringUnitWidth(pageText) * 7 / doc.internal.scaleFactor;
      doc.text(pageText, marginLeft + tableWidth - pageTextWidth, pageHeight - 8);
    }

    const safeNome = nomeAcao.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`relatorio_acao_${safeNome}_${dataInicio}_${dataFim}.pdf`);
  };

  const generateActionDeliveryPDF = (nomeAcao: string) => {
    const atendimentos = rawAtendimentosAcoes
      .filter((a: any) => a.solicitante === nomeAcao)
      .sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''));

    if (atendimentos.length === 0) {
      alert('Nenhum atendimento encontrado para esta ação.');
      return;
    }

    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [0, 135, 81];
    const accentColor: [number, number, number] = [232, 245, 233];
    const borderColor: [number, number, number] = [200, 230, 201];
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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

    // Subtítulo 2 (Ação)
    doc.setFontSize(8);
    const actionText = `Ação: ${nomeAcao}`;
    const actionWidth = doc.getStringUnitWidth(actionText) * 8 / doc.internal.scaleFactor;
    const actionX = logoBase64 ? 52 + (pageWidth - 52 - actionWidth) / 2 : (pageWidth - actionWidth) / 2;
    doc.text(actionText, actionX, 32);

    // Box de informações do período
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(15, 48, pageWidth - 30, 12, 2, 2, 'F');

    const crono = chronologicalData.find(c => c.acao === nomeAcao);
    const periodoAcao = crono
      ? (crono.dataInicio === crono.dataFim
        ? formatDateFull(crono.dataInicio)
        : `${formatDateFull(crono.dataInicio)} a ${formatDateFull(crono.dataFim)}`)
      : `${formatDateFull(dataInicio)} a ${formatDateFull(dataFim)}`;

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const periodoLabel = `PERÍODO: ${periodoAcao}`;
    const periodoLabelWidth = doc.getStringUnitWidth(periodoLabel) * 9 / doc.internal.scaleFactor;
    doc.text(periodoLabel, (pageWidth - periodoLabelWidth) / 2, 55);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const totalText = `Total: ${atendimentos.length} ${atendimentos.length === 1 ? 'atendimento' : 'atendimentos'}`;
    const totalTextWidth = doc.getStringUnitWidth(totalText) * 8 / doc.internal.scaleFactor;
    doc.text(totalText, pageWidth - 20 - totalTextWidth, 55);

    // Table
    const tableColumn = ['Nº', 'Nome Completo', 'CPF', 'Assinatura'];
    const tableRows = atendimentos.map((at: any, index: number) => [
      (index + 1).toString(),
      at.nome || '—',
      at.cpf ? at.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—',
      ''
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 65,
      styles: {
        fontSize: 9,
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        lineColor: borderColor,
        lineWidth: 0.1,
        minCellHeight: 12,
        textColor: [40, 40, 40],
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
        lineWidth: 0
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: [0, 135, 81] },
        1: { cellWidth: 85, halign: 'left', overflow: 'linebreak' },
        2: { cellWidth: 35, halign: 'center', fontStyle: 'normal', font: 'courier' },
        3: { cellWidth: 48, halign: 'center', fillColor: [250, 250, 250] }
      },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      margin: { top: 20, left: 15, right: 15, bottom: 25 },
      rowPageBreak: 'avoid',
      showHead: 'everyPage'
    });

    // --- PÓS-PROCESSAMENTO: RODAPÉ E HEADER PÁGINAS 2+ ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Usuário';

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
        doc.text('LISTA DE ENTREGA', logoBase64 ? 24 : 15, 11);

        // Período no canto direito
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const headerPeriodoWidth = doc.getStringUnitWidth(periodoAcao) * 7 / doc.internal.scaleFactor;
        doc.text(periodoAcao, pageWidth - 15 - headerPeriodoWidth, 11);
      }

      // Rodapé
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.5);
      doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 110, 110);

      const now = new Date();
      doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 15, pageHeight - 12);

      doc.setFont('helvetica', 'bold');
      const atendenteTextW = doc.getStringUnitWidth(userName) * 7 / doc.internal.scaleFactor;
      doc.text(userName, (pageWidth - atendenteTextW) / 2, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextW = doc.getStringUnitWidth(pageText) * 7 / doc.internal.scaleFactor;
      doc.text(pageText, pageWidth - pageTextW - 15, pageHeight - 12);
    }

    const safeNome = nomeAcao.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`lista_entrega_acao_${safeNome}_${dataInicio}_${dataFim}.pdf`);
  };

  // =============================================
  // HELPERS
  // =============================================



  const getAcaoPeriodo = (nomeAcao: string) => {
    const crono = chronologicalData.find(c => c.acao === nomeAcao);
    if (!crono) return '—';
    if (crono.dataInicio === crono.dataFim) return formatDateFull(crono.dataInicio);
    return `${formatDateShort(crono.dataInicio)} — ${formatDateFull(crono.dataFim)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-emerald-200">
          <p className="font-bold text-gray-800 text-sm">{payload[0].payload.nome || payload[0].name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {payload[0].name}: <span className="font-bold text-emerald-600">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // =============================================
  // RENDER
  // =============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <FiRefreshCw className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-gray-500">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const totalConcluidos = acoes.reduce((s, a) => s + a.concluidos, 0);
  const totalEmAndamento = acoes.reduce((s, a) => s + a.emAndamento, 0);

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-500">

      {/* === Page Header === */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="group flex items-center text-gray-400 hover:text-emerald-600 transition-colors mb-3 text-sm"
          >
            <FiArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
              <FiMapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Relatório</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ações Itinerantes ALECE</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Análise detalhada de atendimentos por ação itinerante
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={generateChronologicalPDF}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all"
          >
            <FiClock className="w-4 h-4" />
            Lista Cronológica
          </button>
          <button
            onClick={generatePDF}
            className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200/50 hover:-translate-y-0.5 transition-all"
          >
            <FiDownload className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* === Filters === */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FiFilter className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 h-10 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 h-10 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Filtrar por Ação</label>
            <select
              value={selectedAcao || ''}
              onChange={(e) => setSelectedAcao(e.target.value || null)}
              className="w-full px-3 py-2 h-10 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
            >
              <option value="">Todas as Ações</option>
              {acoes.map(acao => (
                <option key={acao.nome} value={acao.nome}>{acao.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* === Stats Cards === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total de Ações" value={acoes.length} icon={<FiActivity className="h-5 w-5" />} color="emerald" />
        <StatCard label="Atendimentos" value={totalAtendimentos} icon={<FiUsers className="h-5 w-5" />} color="teal" />
        <StatCard label="Concluídos" value={totalConcluidos} icon={<FiCheckCircle className="h-5 w-5" />} color="green" />
        <StatCard label="Em Andamento" value={totalEmAndamento} icon={<FiClock className="h-5 w-5" />} color="amber" />
      </div>

      {/* === Charts === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FiBarChart2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Atendimentos por Ação</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={acoes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="nome"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11, fill: '#6B7280' }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="total" fill={COLORS.primary} name="Total" radius={[6, 6, 0, 0]} />
              <Bar dataKey="concluidos" fill={COLORS.success} name="Concluídos" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center">
              <FiPieChart className="h-3.5 w-3.5 text-teal-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              Distribuição de Status {selectedAcao && <span className="font-normal text-gray-400">— {selectedAcao}</span>}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={statusData as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                outerRadius={110}
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

      {/* === Timeline Chart === */}
      {timelineData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FiCalendar className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Evolução de Atendimentos</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(value) => formatDateShort(value)}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip
                labelFormatter={(value) => formatDateFull(value)}
                content={<CustomTooltip />}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="atendimentos"
                stroke={COLORS.primary}
                strokeWidth={2.5}
                name="Atendimentos"
                dot={{ fill: COLORS.primary, r: 4 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* === Table === */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FiMapPin className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Detalhamento por Ação</h3>
          <span className="ml-auto text-xs text-gray-400">{acoes.length} ações</span>
        </div>

        {acoes.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-14 w-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Nenhuma ação encontrada no período</p>
            <p className="text-xs text-gray-400 mt-1">Ajuste os filtros para visualizar os dados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Ação</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Período</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Concluídos</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Em Andamento</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Cancelados</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">% Conclusão</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Relatórios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {acoes.map((acao, idx) => (
                  <tr
                    key={acao.nome}
                    className={`hover:bg-emerald-50/40 transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{acao.nome}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FiCalendar className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                        <span className="whitespace-nowrap">{getAcaoPeriodo(acao.nome)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {acao.total}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                        {acao.concluidos}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center relative">
                      {acao.emAndamento > 0 ? (
                        <>
                          <button
                            onClick={() => setExpandedEmAndamento(expandedEmAndamento === acao.nome ? null : acao.nome)}
                            className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                              expandedEmAndamento === acao.nome
                                ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-200'
                                : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 hover:border-teal-300 hover:shadow-sm'
                            }`}
                            title="Clique para ver os atendimentos em andamento"
                          >
                            {acao.emAndamento}
                          </button>

                          {expandedEmAndamento === acao.nome && (
                            <div
                              ref={popoverRef}
                              className="absolute z-50 top-full mt-1 right-0 w-[380px] bg-white rounded-xl border border-gray-200 shadow-2xl shadow-gray-300/40 animate-in fade-in slide-in-from-top-2 duration-200"
                              style={{ maxHeight: '320px' }}
                            >
                              {/* Popover Header */}
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-t-xl">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-md bg-teal-100 flex items-center justify-center">
                                    <FiClock className="h-3 w-3 text-teal-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-800">Em Andamento</p>
                                    <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{acao.nome}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setExpandedEmAndamento(null)}
                                  className="h-6 w-6 rounded-md hover:bg-gray-200/60 flex items-center justify-center transition-colors"
                                >
                                  <FiX className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                              </div>

                              {/* Popover Content */}
                              <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
                                {rawAtendimentosAcoes
                                  .filter((a: any) => a.solicitante === acao.nome && (
                                    a.status?.toLowerCase() === 'em_andamento' ||
                                    a.status?.toLowerCase() === 'em andamento' ||
                                    a.status?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('em_andamento') ||
                                    a.status?.toLowerCase().includes('em andamento')
                                  ))
                                  .sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''))
                                  .map((at: any, i: number) => (
                                    <div
                                      key={at.id || i}
                                      className={`flex items-center gap-3 px-4 py-2.5 text-xs ${
                                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                                      } hover:bg-teal-50/40 transition-colors`}
                                    >
                                      <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                                        <FiUser className="h-3 w-3 text-teal-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 truncate">{at.nome || '—'}</p>
                                        <p className="text-[10px] text-gray-400 flex items-center gap-1 flex-wrap">
                                          <span>CPF:</span>
                                          {at.cpf ? (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const cpfFormatado = at.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                                                navigator.clipboard.writeText(cpfFormatado);
                                                setCopiedCpf(at.cpf);
                                                setTimeout(() => setCopiedCpf(null), 1500);
                                              }}
                                              title="Clique para copiar o CPF"
                                              className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded transition-all cursor-pointer ${
                                                copiedCpf === at.cpf
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'hover:bg-gray-200/60 text-gray-500 hover:text-gray-700'
                                              }`}
                                            >
                                              <span className="font-mono">{at.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
                                              {copiedCpf === at.cpf ? (
                                                <FiCheck className="w-2.5 h-2.5 text-green-600" />
                                              ) : (
                                                <FiCopy className="w-2.5 h-2.5 opacity-50" />
                                              )}
                                            </button>
                                          ) : (
                                            <span>—</span>
                                          )}
                                          {at.dia_atual && <span>• {formatDateFull(at.dia_atual)}</span>}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                }
                                {rawAtendimentosAcoes
                                  .filter((a: any) => a.solicitante === acao.nome && (
                                    a.status?.toLowerCase() === 'em_andamento' ||
                                    a.status?.toLowerCase() === 'em andamento' ||
                                    a.status?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('em_andamento') ||
                                    a.status?.toLowerCase().includes('em andamento')
                                  )).length === 0 && (
                                  <div className="px-4 py-6 text-center text-xs text-gray-400">
                                    Nenhum atendimento em andamento encontrado
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {acao.emAndamento}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center relative">
                      {acao.outros > 0 ? (
                        <>
                          <button
                            onClick={() => setExpandedCancelados(expandedCancelados === acao.nome ? null : acao.nome)}
                            className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                              expandedCancelados === acao.nome
                                ? 'bg-gray-600 text-white border-gray-700 shadow-md shadow-gray-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm'
                            }`}
                            title="Clique para ver os atendimentos cancelados"
                          >
                            {acao.outros}
                          </button>

                          {expandedCancelados === acao.nome && (
                            <div
                              ref={popoverCanceladosRef}
                              className="absolute z-50 top-full mt-1 right-0 w-[380px] bg-white rounded-xl border border-gray-200 shadow-2xl shadow-gray-300/40 animate-in fade-in slide-in-from-top-2 duration-200"
                              style={{ maxHeight: '320px' }}
                            >
                              {/* Popover Header */}
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50 rounded-t-xl">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-md bg-gray-200 flex items-center justify-center">
                                    <FiAlertCircle className="h-3 w-3 text-gray-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-800">Cancelados</p>
                                    <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{acao.nome}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setExpandedCancelados(null)}
                                  className="h-6 w-6 rounded-md hover:bg-gray-200/60 flex items-center justify-center transition-colors"
                                >
                                  <FiX className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                              </div>

                              {/* Popover Content */}
                              <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
                                {rawAtendimentosAcoes
                                  .filter((a: any) => a.solicitante === acao.nome && (
                                    a.status?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('cancelado') ||
                                    a.status?.toLowerCase() === 'cancelado' ||
                                    a.status === 'Cancelado' ||
                                    a.status === 'CANCELADO' ||
                                    a.status?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('correcao') ||
                                    a.status?.toLowerCase().includes('correção') ||
                                    a.status?.toLowerCase() === 'correcao' ||
                                    a.status?.toLowerCase() === 'correção' ||
                                    a.status?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('bloqueado') ||
                                    a.status?.toLowerCase() === 'bloqueado'
                                  ))
                                  .sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''))
                                  .map((at: any, i: number) => (
                                    <div
                                      key={at.id || i}
                                      className={`flex items-center gap-3 px-4 py-2.5 text-xs ${
                                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                                      } hover:bg-gray-50/80 transition-colors`}
                                    >
                                      <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <FiUser className="h-3 w-3 text-gray-500" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 truncate">{at.nome || '—'}</p>
                                        <p className="text-[10px] text-gray-400 flex items-center gap-1 flex-wrap">
                                          <span>CPF:</span>
                                          {at.cpf ? (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const cpfFormatado = at.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                                                navigator.clipboard.writeText(cpfFormatado);
                                                setCopiedCpf(at.cpf);
                                                setTimeout(() => setCopiedCpf(null), 1500);
                                              }}
                                              title="Clique para copiar o CPF"
                                              className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded transition-all cursor-pointer ${
                                                copiedCpf === at.cpf
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'hover:bg-gray-200/60 text-gray-500 hover:text-gray-700'
                                              }`}
                                            >
                                              <span className="font-mono">{at.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
                                              {copiedCpf === at.cpf ? (
                                                <FiCheck className="w-2.5 h-2.5 text-green-600" />
                                              ) : (
                                                <FiCopy className="w-2.5 h-2.5 opacity-50" />
                                              )}
                                            </button>
                                          ) : (
                                            <span>—</span>
                                          )}
                                          {at.dia_atual && <span>• {formatDateFull(at.dia_atual)}</span>}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                }
                                {rawAtendimentosAcoes
                                  .filter((a: any) => a.solicitante === acao.nome && (
                                    a.status?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('cancelado') ||
                                    a.status?.toLowerCase() === 'cancelado' ||
                                    a.status === 'Cancelado' ||
                                    a.status === 'CANCELADO' ||
                                    a.status?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('correcao') ||
                                    a.status?.toLowerCase().includes('correção') ||
                                    a.status?.toLowerCase() === 'correcao' ||
                                    a.status?.toLowerCase() === 'correção' ||
                                    a.status?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('bloqueado') ||
                                    a.status?.toLowerCase() === 'bloqueado'
                                  )).length === 0 && (
                                  <div className="px-4 py-6 text-center text-xs text-gray-400">
                                    Nenhum atendimento cancelado encontrado
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">
                          {acao.outros}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                            style={{ width: `${acao.percentualConclusao}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700 tabular-nums w-12 text-right">
                          {acao.percentualConclusao.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => generateActionDetailPDF(acao.nome)}
                          title="Relatório detalhado de atendimentos"
                          className="group/btn inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                        >
                          <FiFileText className="w-3 h-3" />
                          <span className="hidden xl:inline">Detalhado</span>
                        </button>
                        <button
                          onClick={() => generateActionDeliveryPDF(acao.nome)}
                          title="Lista de entrega por ordem alfabética"
                          className="group/btn inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-all"
                        >
                          <FiList className="w-3 h-3" />
                          <span className="hidden xl:inline">Entrega</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                Mostrando <span className="font-semibold text-gray-600">{acoes.length}</span> ações com <span className="font-semibold text-gray-600">{totalAtendimentos}</span> atendimentos no total
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* === Stat Card === */
function StatCard({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'emerald' | 'teal' | 'green' | 'amber';
}) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  const iconBg = {
    emerald: 'bg-emerald-100 text-emerald-600',
    teal: 'bg-teal-100 text-teal-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className={`rounded-xl border p-4 ${styles[color]} transition-all hover:shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
