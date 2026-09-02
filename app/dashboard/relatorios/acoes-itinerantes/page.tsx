'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin, getUserRole } from '@/lib/models/User';
import { updateViagemStatus, createViagem } from '@/lib/viagens-service';
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

const MESES = [
  { numero: 1, nome: 'Janeiro', sigla: 'Jan' },
  { numero: 2, nome: 'Fevereiro', sigla: 'Fev' },
  { numero: 3, nome: 'Março', sigla: 'Mar' },
  { numero: 4, nome: 'Abril', sigla: 'Abr' },
  { numero: 5, nome: 'Maio', sigla: 'Mai' },
  { numero: 6, nome: 'Junho', sigla: 'Jun' },
  { numero: 7, nome: 'Julho', sigla: 'Jul' },
  { numero: 8, nome: 'Agosto', sigla: 'Ago' },
  { numero: 9, nome: 'Setembro', sigla: 'Set' },
  { numero: 10, nome: 'Outubro', sigla: 'Out' },
  { numero: 11, nome: 'Novembro', sigla: 'Nov' },
  { numero: 12, nome: 'Dezembro', sigla: 'Dez' },
];

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
  const userRole = getUserRole(user);
  const userIsSuperAdmin = isSuperAdmin(userRole);

  const [loading, setLoading] = useState(true);
  const [acoes, setAcoes] = useState<AcaoData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [tipoFiltroPeriodo, setTipoFiltroPeriodo] = useState<'meses' | 'personalizado'>('meses');
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [mesesSelecionados, setMesesSelecionados] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
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

  // Estado adicional para mapear o status de cada ação na Gestão de Viagens (nomeNormalizado -> status)
  const [viagensStatusMap, setViagensStatusMap] = useState<Map<string, string>>(new Map());
  const [statusAcaoFilter, setStatusAcaoFilter] = useState<'todas' | 'concluidas' | 'nao_concluidas' | 'pendentes' | 'em_andamento'>('todas');
  const [togglingAcao, setTogglingAcao] = useState<string | null>(null);

  const aplicarMeses = (novosMeses: number[], ano: number) => {
    setMesesSelecionados(novosMeses);
    if (novosMeses.length > 0) {
      const minMes = Math.min(...novosMeses);
      const maxMes = Math.max(...novosMeses);
      const inicioMesStr = String(minMes).padStart(2, '0');
      const fimMesStr = String(maxMes).padStart(2, '0');
      const ultimoDia = new Date(ano, maxMes, 0).getDate();
      setDataInicio(`${ano}-${inicioMesStr}-01`);
      setDataFim(`${ano}-${fimMesStr}-${String(ultimoDia).padStart(2, '0')}`);
    }
  };

  const toggleMes = (num: number) => {
    let novosMeses: number[];
    if (mesesSelecionados.includes(num)) {
      novosMeses = mesesSelecionados.filter(m => m !== num);
      if (novosMeses.length === 0) novosMeses = [num];
    } else {
      novosMeses = [...mesesSelecionados, num].sort((a, b) => a - b);
    }
    aplicarMeses(novosMeses, anoSelecionado);
  };

  const selecionarTodosMeses = () => {
    aplicarMeses([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], anoSelecionado);
  };

  const selecionarPrimeiroSemestre = () => {
    aplicarMeses([1, 2, 3, 4, 5, 6], anoSelecionado);
  };

  const selecionarSegundoSemestre = () => {
    aplicarMeses([7, 8, 9, 10, 11, 12], anoSelecionado);
  };

  const selecionarMesAtual = () => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    setAnoSelecionado(anoAtual);
    aplicarMeses([mesAtual], anoAtual);
  };

  const mudarAno = (novoAno: number) => {
    setAnoSelecionado(novoAno);
    aplicarMeses(mesesSelecionados.length > 0 ? mesesSelecionados : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], novoAno);
  };

  const getPeriodoTexto = useCallback(() => {
    if (!dataInicio || !dataFim) return '';
    if (dataInicio === dataFim) return formatDateFull(dataInicio);

    const [yIni, mIni, dIni] = dataInicio.split('-').map(Number);
    const [yFim, mFim, dFim] = dataFim.split('-').map(Number);

    if (!yIni || !mIni || !dIni || !yFim || !mFim || !dFim) {
      return `${dataInicio} a ${dataFim}`;
    }

    const ultimoDiaFim = new Date(yFim, mFim, 0).getDate();

    // Se começou no dia 01 e terminou no último dia do mesmo mês
    if (yIni === yFim && mIni === mFim && dIni === 1 && dFim === ultimoDiaFim) {
      const mesNome = MESES.find(m => m.numero === mIni)?.nome || `Mês ${mIni}`;
      return `${mesNome} de ${yIni}`;
    }

    // Se for o ano completo (01/01 a 31/12)
    if (yIni === yFim && mIni === 1 && dIni === 1 && mFim === 12 && dFim === 31) {
      return `Ano Completo de ${yIni}`;
    }

    // Se for 1º semestre (01/01 a 30/06)
    if (yIni === yFim && mIni === 1 && dIni === 1 && mFim === 6 && dFim === 30) {
      return `1º Semestre de ${yIni}`;
    }

    // Se for 2º semestre (01/07 a 31/12)
    if (yIni === yFim && mIni === 7 && dIni === 1 && mFim === 12 && dFim === 31) {
      return `2º Semestre de ${yIni}`;
    }

    // Se começou no dia 01 de um mês e terminou no último dia de outro mês no mesmo ano
    if (yIni === yFim && dIni === 1 && dFim === ultimoDiaFim) {
      const mesIniNome = MESES.find(m => m.numero === mIni)?.nome;
      const mesFimNome = MESES.find(m => m.numero === mFim)?.nome;
      return `${mesIniNome} a ${mesFimNome} de ${yIni}`;
    }

    // Caso de dias específicos (ex: 05/02/2025 a 20/03/2025)
    return `${formatDateFull(dataInicio)} a ${formatDateFull(dataFim)}`;
  }, [dataInicio, dataFim]);

  // Função para verificar se uma ação itinerante está concluída
  const checkIsConcluida = useCallback((acao: AcaoData) => {
    const nomeNorm = acao.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // 1. Se houver status explícito cadastrado na Gestão de Viagens
    if (viagensStatusMap.has(nomeNorm)) {
      return viagensStatusMap.get(nomeNorm) === 'concluida';
    }

    // 2. Fallback: Se 100% dos atendimentos forem concluídos sem pendências
    if (acao.total > 0 && acao.emAndamento === 0 && (acao.concluidos === acao.total || acao.percentualConclusao >= 100)) {
      return true;
    }

    return false;
  }, [viagensStatusMap]);

  // Alternar conclusão da ação diretamente pelo relatório (Exclusivo SuperAdmin)
  const handleToggleConcluirAcao = async (acaoNome: string) => {
    if (!userIsSuperAdmin) {
      alert('Apenas SuperAdmins podem alterar o status de conclusão da ação.');
      return;
    }

    setTogglingAcao(acaoNome);
    const nomeNorm = acaoNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const isCurrentlyConcluida = checkIsConcluida({ nome: acaoNome } as any);
    const newStatus = isCurrentlyConcluida ? 'em_andamento' : 'concluida';

    try {
      const municipioExtraido = acaoNome.replace(/^(Ação|Assembleia)\s+Itinerante\s*[-–—]?\s*/i, '').trim() || acaoNome;

      // Buscar viagens existentes por titulo ou municipio de forma segura sem falhar em PostgREST
      const { data: byTitulo } = await supabase
        .from('viagens')
        .select('id, titulo, status')
        .eq('titulo', acaoNome);

      const { data: byMunicipio } = await supabase
        .from('viagens')
        .select('id, titulo, status')
        .eq('municipio', municipioExtraido);

      const allMatches = [...(byTitulo || []), ...(byMunicipio || [])];
      const uniqueMap = new Map<number, any>();
      allMatches.forEach(v => uniqueMap.set(v.id, v));
      const existingViagens = Array.from(uniqueMap.values());

      if (existingViagens && existingViagens.length > 0) {
        for (const v of existingViagens) {
          await updateViagemStatus(v.id, newStatus);
        }
      } else {
        await createViagem(
          {
            titulo: acaoNome,
            municipio: municipioExtraido,
            local_evento: 'Ação Itinerante',
            setor: 'DIRETORIA GERAL',
            data_ida: new Date().toISOString(),
            data_retorno: new Date().toISOString(),
            dias_acao: 1,
            status: newStatus,
            objetivo: `Ação Itinerante ${acaoNome} definida como ${newStatus} por SuperAdmin via relatório.`,
            responsavel_nome: '',
            meta_atendimentos: 0,
            orcamento_estimado: 0,
            transporte_info: ''
          },
          [],
          []
        );
      }

      setViagensStatusMap(prev => {
        const next = new Map(prev);
        next.set(nomeNorm, newStatus);
        const munNorm = municipioExtraido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (munNorm) next.set(munNorm, newStatus);
        return next;
      });
    } catch (err: any) {
      console.error('Erro ao alterar status da ação:', err);
      alert('Erro ao atualizar status da ação: ' + (err.message || 'Ocorreu um erro inesperado.'));
    } finally {
      setTogglingAcao(null);
    }
  };

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
    if (!dataInicio || !dataFim) {
      return;
    }
    setLoading(true);
    try {
      console.log('=== BUSCA DE ATENDIMENTOS E VIAGENS ===');
      console.log(`Período da consulta: ${dataInicio} a ${dataFim}`);

      // Buscar viagens concluídas cadastradas na Gestão de Viagens
      try {
        const { data: vData } = await supabase.from('viagens').select('titulo, municipio, status');
        if (vData) {
          const map = new Map<string, string>();

          vData.forEach((v: any) => {
            const titNorm = v.titulo ? v.titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '';
            const munNorm = v.municipio ? v.municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '';

            if (titNorm) {
              if (v.status === 'concluida' || !map.has(titNorm)) {
                map.set(titNorm, v.status);
              }
            }
            if (munNorm) {
              if (v.status === 'concluida' || !map.has(munNorm)) {
                map.set(munNorm, v.status);
              }
            }
          });

          setViagensStatusMap(map);
        }
      } catch (errV) {
        console.error('Erro ao consultar viagens para status de conclusão:', errV);
      }

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
  // PDF GENERATORS — updated to apply active filters
  // =============================================

  const getAcoesFiltradasParaExportacao = () => {
    return acoes.filter((acao) => {
      if (selectedAcao && acao.nome !== selectedAcao) return false;
      const isConc = checkIsConcluida(acao);
      if (statusAcaoFilter === 'concluidas') return isConc;
      if (statusAcaoFilter === 'nao_concluidas' || statusAcaoFilter === 'pendentes' || statusAcaoFilter === 'em_andamento') return !isConc;
      return true;
    });
  };

  const generatePDF = () => {
    const acoesFiltradas = getAcoesFiltradasParaExportacao();

    if (acoesFiltradas.length === 0) {
      alert('Nenhuma ação encontrada com os filtros selecionados para exportação.');
      return;
    }

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

    // Período e Total Filtrado
    const totalAtendimentosFiltrados = acoesFiltradas.reduce((sum, a) => sum + a.total, 0);
    doc.setFontSize(8.5);
    const periodoText = `Período: ${getPeriodoTexto()}`;
    const statusText = statusAcaoFilter === 'concluidas'
      ? ' | Status: Concluídas'
      : statusAcaoFilter === 'nao_concluidas'
      ? ' | Status: Não Concluídas'
      : '';
    const acoesCountText = `${acoesFiltradas.length} ${acoesFiltradas.length === 1 ? 'ação' : 'ações'}`;
    const totalText = `Total: ${totalAtendimentosFiltrados} atendimentos (${acoesCountText}${statusText})`;
    const infoText = `${periodoText}  |  ${totalText}`;
    const infoWidth = doc.getStringUnitWidth(infoText) * 8.5 / doc.internal.scaleFactor;
    const infoX = logoBase64 ? 52 + (pageWidth - 52 - infoWidth) / 2 : (pageWidth - infoWidth) / 2;
    doc.text(infoText, infoX, 32);

    const tableData = acoesFiltradas.map(acao => {
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
      styles: { fontSize: 7, overflow: 'ellipsize' },
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
        const headerPeriodo = getPeriodoTexto();
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

    const fileSuffix = `${dataInicio}-${dataFim}`;
    doc.save(`acoes-itinerantes-${fileSuffix}.pdf`);
  };

  const generateChronologicalPDF = () => {
    const acoesFiltradas = getAcoesFiltradasParaExportacao();
    const nomesAcoesFiltradas = new Set(acoesFiltradas.map(a => a.nome));
    const cronoFiltrada = chronologicalData.filter(item => nomesAcoesFiltradas.has(item.acao));

    if (cronoFiltrada.length === 0) {
      alert('Nenhuma ação encontrada com os filtros selecionados para exportação.');
      return;
    }

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

    // Período e Total
    const totalCronoAtendimentos = cronoFiltrada.reduce((sum, item) => sum + item.total, 0);
    doc.setFontSize(8.5);
    const periodoText = `Período: ${getPeriodoTexto()}`;
    const statusText = statusAcaoFilter === 'concluidas'
      ? ' | Status: Concluídas'
      : statusAcaoFilter === 'nao_concluidas'
      ? ' | Status: Não Concluídas'
      : '';
    const acoesCountText = `${cronoFiltrada.length} ${cronoFiltrada.length === 1 ? 'ação' : 'ações'}`;
    const infoText = `${periodoText}  |  Total: ${totalCronoAtendimentos} atendimentos (${acoesCountText}${statusText})`;
    const infoWidth = doc.getStringUnitWidth(infoText) * 8.5 / doc.internal.scaleFactor;
    const infoX = logoBase64 ? 52 + (pageWidth - 52 - infoWidth) / 2 : (pageWidth - infoWidth) / 2;
    doc.text(infoText, infoX, 32);

    const formattedData = cronoFiltrada.map(item => {
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
      styles: { fontSize: 10, cellPadding: 3, overflow: 'ellipsize' },
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
        const headerPeriodo = getPeriodoTexto();
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

    const fileSuffix = `${dataInicio}-${dataFim}`;
    doc.save(`acoes-itinerantes-cronologica-${fileSuffix}.pdf`);
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
      : getPeriodoTexto();

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
    const tableColumn = ['Nº', 'Data', 'Nome', 'CPF', 'Status'];
    const tableRows = atendimentos.map((at: any, index: number) => [
      (index + 1).toString(),
      formatDateFull(at.dia_atual),
      at.nome || '—',
      at.cpf ? at.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—',
      at.status ? at.status.charAt(0).toUpperCase() + at.status.slice(1).toLowerCase() : '—'
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
        2: { cellWidth: 97, halign: 'left' },   // Nome
        3: { cellWidth: 35, halign: 'center' }, // CPF
        4: { cellWidth: 30, halign: 'center' }  // Status
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
    const fileSuffix = tipoFiltroPeriodo === 'meses'
      ? `meses-${anoSelecionado}`
      : `${dataInicio}_${dataFim}`;
    doc.save(`relatorio_acao_${safeNome}_${fileSuffix}.pdf`);
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
    doc.roundedRect(10, 48, pageWidth - 20, 12, 2, 2, 'F');

    const crono = chronologicalData.find(c => c.acao === nomeAcao);
    const periodoAcao = crono
      ? (crono.dataInicio === crono.dataFim
        ? formatDateFull(crono.dataInicio)
        : `${formatDateFull(crono.dataInicio)} a ${formatDateFull(crono.dataFim)}`)
      : getPeriodoTexto();

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
    doc.text(totalText, pageWidth - 10 - totalTextWidth, 55);

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
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [0, 135, 81] },
        1: { cellWidth: 95, halign: 'left', overflow: 'ellipsize' },
        2: { cellWidth: 30, halign: 'center', fontStyle: 'normal', font: 'courier' },
        3: { cellWidth: 55, halign: 'center', fillColor: [250, 250, 250] }
      },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      margin: { top: 20, left: 10, right: 10, bottom: 25 },
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
        doc.text('LISTA DE ENTREGA', logoBase64 ? 24 : 10, 11);

        // Período no canto direito
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const headerPeriodoWidth = doc.getStringUnitWidth(periodoAcao) * 7 / doc.internal.scaleFactor;
        doc.text(periodoAcao, pageWidth - 10 - headerPeriodoWidth, 11);
      }

      // Rodapé
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.5);
      doc.line(10, pageHeight - 18, pageWidth - 10, pageHeight - 18);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 110, 110);

      const now = new Date();
      doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 10, pageHeight - 12);

      doc.setFont('helvetica', 'bold');
      const atendenteTextW = doc.getStringUnitWidth(userName) * 7 / doc.internal.scaleFactor;
      doc.text(userName, (pageWidth - atendenteTextW) / 2, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextW = doc.getStringUnitWidth(pageText) * 7 / doc.internal.scaleFactor;
      doc.text(pageText, pageWidth - pageTextW - 10, pageHeight - 12);
    }

    const safeNome = nomeAcao.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileSuffix = tipoFiltroPeriodo === 'meses'
      ? `meses-${anoSelecionado}`
      : `${dataInicio}_${dataFim}`;
    doc.save(`lista_entrega_acao_${safeNome}_${fileSuffix}.pdf`);
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
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 sm:p-5 space-y-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FiFilter className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Filtros de Período e Ações</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-200/60">
            <FiCalendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Período: <strong className="text-emerald-950">{getPeriodoTexto()}</strong>
            </span>
          </div>
        </div>

        {/* Month & Year Selection Panel */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Ano:</span>
              <div className="flex items-center gap-1">
                {[2024, 2025, 2026, 2027].map((ano) => (
                  <button
                    key={ano}
                    type="button"
                    onClick={() => mudarAno(ano)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      anoSelecionado === ano
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {ano}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-xs text-gray-400 mr-1 font-medium">Atalhos rápidos:</span>
              <button
                type="button"
                onClick={selecionarMesAtual}
                className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={selecionarPrimeiroSemestre}
                className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
              >
                1º Semestre
              </button>
              <button
                type="button"
                onClick={selecionarSegundoSemestre}
                className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
              >
                2º Semestre
              </button>
              <button
                type="button"
                onClick={selecionarTodosMeses}
                className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
              >
                Ano Completo
              </button>
            </div>
          </div>

          {/* 12 Month Pills Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5">
            {MESES.map((mes) => {
              const isSelected = mesesSelecionados.includes(mes.numero);
              return (
                <button
                  key={mes.numero}
                  type="button"
                  onClick={() => toggleMes(mes.numero)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">{mes.sigla}</span>
                  <span className="text-xs truncate max-w-full px-1">{mes.nome}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Exact Date Range: De Dia X até Dia Y */}
        <div className="pt-3 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <FiCalendar className="w-3.5 h-3.5 text-emerald-600" />
                Data Início (Dia X)
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 h-10 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <FiCalendar className="w-3.5 h-3.5 text-emerald-600" />
                Data Fim (Dia Y)
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 h-10 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Filtrar por Ação</label>
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Status da Ação</label>
              <select
                value={statusAcaoFilter}
                onChange={(e) => setStatusAcaoFilter(e.target.value as any)}
                className="w-full px-3 py-2 h-10 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 font-semibold transition-all text-emerald-800 cursor-pointer"
              >
                <option value="todas">Todas as Ações</option>
                <option value="concluidas">✅ Ações Concluídas</option>
                <option value="nao_concluidas">⏳ Ações Não Concluídas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* === Stats Cards === */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total de Ações" value={acoes.length} icon={<FiActivity className="h-5 w-5" />} color="emerald" />
        <StatCard label="Ações Concluídas" value={`${acoes.filter(checkIsConcluida).length}/${acoes.length}`} icon={<FiCheckCircle className="h-5 w-5" />} color="green" />
        <StatCard label="Ações Pendentes" value={acoes.length - acoes.filter(checkIsConcluida).length} icon={<FiClock className="h-5 w-5" />} color="amber" />
        <StatCard label="Atendimentos" value={totalAtendimentos} icon={<FiUsers className="h-5 w-5" />} color="teal" />
        <StatCard label="Concluídos" value={totalConcluidos} icon={<FiCheckCircle className="h-5 w-5" />} color="green" />
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
          <span className="ml-auto text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {acoes.filter((acao) => {
              const isConc = checkIsConcluida(acao);
              if (statusAcaoFilter === 'concluidas') return isConc;
              if (statusAcaoFilter === 'nao_concluidas' || statusAcaoFilter === 'pendentes' || statusAcaoFilter === 'em_andamento') return !isConc;
              return true;
            }).length} de {acoes.length} ações
          </span>
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
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Relatórios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {acoes
                  .filter((acao) => {
                    const isConc = checkIsConcluida(acao);
                    if (statusAcaoFilter === 'concluidas') return isConc;
                    if (statusAcaoFilter === 'nao_concluidas' || statusAcaoFilter === 'pendentes' || statusAcaoFilter === 'em_andamento') return !isConc;
                    return true;
                  })
                  .map((acao, idx) => {
                    const isConcluida = checkIsConcluida(acao);
                    return (
                      <tr
                        key={acao.nome}
                        className={`transition-all duration-150 ${
                          isConcluida
                            ? 'bg-emerald-100/60 hover:bg-emerald-100/90 border-l-4 border-l-emerald-600 font-medium text-emerald-950 shadow-2xs'
                            : idx % 2 === 0 ? 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent' : 'bg-slate-50/50 hover:bg-slate-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={isConcluida ? 'font-extrabold text-emerald-950' : 'text-gray-900'}>{acao.nome}</span>
                            {isConcluida && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs">
                                <FiCheckCircle className="w-3 h-3 text-white" />
                                Ação Concluída
                              </span>
                            )}
                          </div>
                        </td>
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
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isConcluida ? 'bg-emerald-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                }`}
                                style={{ width: `${acao.percentualConclusao}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold tabular-nums w-14 text-right flex items-center justify-end gap-1 ${
                              isConcluida ? 'text-emerald-700 font-extrabold' : 'text-gray-700'
                            }`}>
                              {acao.percentualConclusao.toFixed(1)}%
                              {isConcluida && <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 inline-block" />}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isConcluida ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Concluída
                              </span>
                              {userIsSuperAdmin && (
                                <button
                                  onClick={() => handleToggleConcluirAcao(acao.nome)}
                                  disabled={togglingAcao === acao.nome}
                                  title="Clique para desmarcar conclusão (Exclusivo SuperAdmin)"
                                  className="px-2 py-0.5 text-[10px] font-bold text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-md transition-all cursor-pointer"
                                >
                                  {togglingAcao === acao.nome ? '...' : 'Reabrir'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              {userIsSuperAdmin ? (
                                <button
                                  onClick={() => handleToggleConcluirAcao(acao.nome)}
                                  disabled={togglingAcao === acao.nome}
                                  title="Clique para definir esta ação como Concluída (Exclusivo SuperAdmin)"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                                >
                                  <FiCheckCircle className="w-3.5 h-3.5" />
                                  {togglingAcao === acao.nome ? 'Salvando...' : 'Marcar Concluída'}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <FiClock className="w-3 h-3 text-amber-600" /> Em Andamento
                                </span>
                              )}
                            </div>
                          )}
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
                    );
                  })}
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
  value: number | string;
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
