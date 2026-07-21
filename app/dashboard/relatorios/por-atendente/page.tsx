'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  FiUsers,
  FiUser,
  FiCalendar,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiArrowLeft,
  FiClock,
  FiActivity,
  FiDatabase,
  FiDownload,
  FiTrendingUp,
  FiAward,
  FiCopy,
  FiRefreshCw,
  FiCheck,
  FiBarChart2,
  FiLayers,
  FiX,
  FiSliders,
} from 'react-icons/fi';
import { MdFingerprint } from 'react-icons/md';
import jsPDF from 'jspdf';

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
  atendente_nome: string;
  usuario_id: string;
  coletor_nome?: string;
  fotos_coletadas?: boolean;
}

interface AtendenteStats {
  nome: string;
  total: number;
  concluidos: number;
  cancelados: number;
  coletas: number;
  atendimentos: Atendimento[];
}

export default function RelatoriosPorAtendentePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [status, setStatus] = useState('');
  const [filtroAcao, setFiltroAcao] = useState(false);
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [atendimentosData, setAtendimentosData] = useState<Atendimento[]>([]);
  const [atendenteStats, setAtendenteStats] = useState<AtendenteStats[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [atendenteExpandido, setAtendenteExpandido] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
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

  const gerarPDFRelatorio = () => {
    if (atendenteStats.length === 0) return;
    setLoadingPdf(true);

    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const hoje = new Date().toLocaleDateString('pt-BR');
      const periodoTexto = dataInicio && dataFim
        ? `${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}`
        : 'Período completo';

      const primaryColor = [0, 135, 81] as [number, number, number]; // Verde ALECE

      // --- Cabeçalho ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageW, 42, 'F');

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
      const title = 'ATENDIMENTOS POR COLABORADOR';
      const titleWidth = doc.getStringUnitWidth(title) * 14 / doc.internal.scaleFactor;
      const titleX = logoBase64 ? 52 + (pageW - 52 - titleWidth) / 2 : (pageW - titleWidth) / 2;
      doc.text(title, titleX, 16);

      // Subtítulo
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const subtitle = 'Assembleia Legislativa do Estado do Ceará';
      const subtitleWidth = doc.getStringUnitWidth(subtitle) * 10 / doc.internal.scaleFactor;
      const subtitleX = logoBase64 ? 52 + (pageW - 52 - subtitleWidth) / 2 : (pageW - subtitleWidth) / 2;
      doc.text(subtitle, subtitleX, 24);

      // Período
      doc.setFontSize(9);
      const infoText = `Período: ${periodoTexto}  |  Emitido em: ${hoje}`;
      const infoWidth = doc.getStringUnitWidth(infoText) * 9 / doc.internal.scaleFactor;
      const infoX = logoBase64 ? 52 + (pageW - 52 - infoWidth) / 2 : (pageW - infoWidth) / 2;
      doc.text(infoText, infoX, 32);

      // --- Totais Gerais ---
      const totalAtend = atendimentosData.length;
      const totalColetas = atendenteStats.reduce((acc, s) => acc + s.coletas, 0);
      const totalGeral = totalAtend + totalColetas;

      doc.setFillColor(241, 245, 249);
      doc.rect(10, 48, pageW - 20, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Total de Atendimentos: ${totalAtend}`, 15, 56);
      doc.text(`Total de Coletas: ${totalColetas}`, 80, 56);
      doc.text(`Total Geral: ${totalGeral}`, 155, 56);

      // --- Cabeçalho da tabela ---
      let y = 68;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, y, pageW - 20, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('COLABORADOR', 15, y + 5.5);
      doc.text('ATEND.', 120, y + 5.5, { align: 'center' });
      doc.text('COLETAS', 150, y + 5.5, { align: 'center' });
      doc.text('TOTAL', 180, y + 5.5, { align: 'center' });
      y += 8;

      // --- Linhas da tabela ---
      atendenteStats.forEach((stats, idx) => {
        if (y > pageH - 20) {
          doc.addPage();
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(0, 0, pageW, 16, 'F');

          if (logoBase64) {
            try {
              doc.addImage(logoBase64, 'PNG', 6, 1, 14, 14);
            } catch (e) { /* skip */ }
          }

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('ATENDIMENTOS POR COLABORADOR', logoBase64 ? 24 : 15, 11);

          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          const headerPeriodoWidth = doc.getStringUnitWidth(periodoTexto) * 7 / doc.internal.scaleFactor;
          doc.text(periodoTexto, pageW - 15 - headerPeriodoWidth, 11);

          y = 22;
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(10, y, pageW - 20, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.text('COLABORADOR', 15, y + 5.5);
          doc.text('ATEND.', 120, y + 5.5, { align: 'center' });
          doc.text('COLETAS', 150, y + 5.5, { align: 'center' });
          doc.text('TOTAL', 180, y + 5.5, { align: 'center' });
          y += 8;
        }

        const isEven = idx % 2 === 0;
        doc.setFillColor(isEven ? 252 : 248, isEven ? 253 : 250, isEven ? 254 : 252);
        doc.rect(10, y, pageW - 20, 8, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        const nomeText = stats.nome.length > 35 ? stats.nome.substring(0, 32) + '...' : stats.nome;
        doc.text(nomeText, 15, y + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(String(stats.total), 120, y + 5.5, { align: 'center' });

        doc.setTextColor(109, 40, 217);
        doc.text(String(stats.coletas), 150, y + 5.5, { align: 'center' });

        doc.setTextColor(13, 148, 136);
        doc.text(String(stats.total + stats.coletas), 180, y + 5.5, { align: 'center' });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.line(10, y + 8, pageW - 10, y + 8);

        y += 8;
      });

      // Total final
      if (y > pageH - 20) {
        doc.addPage();
        y = 22;
      }
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, y, pageW - 20, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL GERAL', 15, y + 6);
      doc.text(String(totalAtend), 120, y + 6, { align: 'center' });
      doc.text(String(totalColetas), 150, y + 6, { align: 'center' });
      doc.text(String(totalGeral), 180, y + 6, { align: 'center' });

      // Rodapé
      const pageCount = (doc as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const rodY = pageH - 10;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Assembleia Legislativa do Estado do Ceará  |  Gerado em ${hoje}  |  Página ${i} de ${pageCount}`,
          pageW / 2, rodY, { align: 'center' }
        );
      }

      const fileName = `relatorio-colaboradores-${periodoTexto.replace(/\//g, '-').replace(/ /g, '')}.pdf`;
      doc.save(fileName);
    } finally {
      setLoadingPdf(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const setDateRange = (range: 'hoje' | 'semana' | 'mes' | 'completo') => {
    const hoje = new Date();
    const dataFimStr = hoje.toISOString().split('T')[0];
    let dataInicioStr = '';

    if (range === 'hoje') {
      dataInicioStr = dataFimStr;
    } else if (range === 'semana') {
      const semanaPassada = new Date(hoje);
      semanaPassada.setDate(hoje.getDate() - 7);
      dataInicioStr = semanaPassada.toISOString().split('T')[0];
    } else if (range === 'mes') {
      const mesPassado = new Date(hoje);
      mesPassado.setMonth(hoje.getMonth() - 1);
      dataInicioStr = mesPassado.toISOString().split('T')[0];
    } else if (range === 'completo') {
      dataInicioStr = '2020-01-01';
    }

    setDataInicio(dataInicioStr);
    setDataFim(dataFimStr);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!user) {
        setMessage({ text: 'Usuário não autenticado', type: 'error' });
        return;
      }

      if (!dataInicio || !dataFim) {
        setMessage({ text: 'É necessário selecionar a data inicial e final', type: 'error' });
        return;
      }

      const dataInicioAjustada = dataInicio + 'T00:00:00';
      const dataFimAjustada = dataFim + 'T23:59:59';

      const fetchAllAtendimentos = async () => {
        const BATCH = 1000;
        let from = 0;
        let allData: any[] = [];
        let hasMore = true;

        while (hasMore) {
          let q = supabase
            .from('atendimentos')
            .select('*')
            .gte('dia_atual', dataInicioAjustada)
            .lte('dia_atual', dataFimAjustada)
            .order('atendente_nome', { ascending: true })
            .order('dia_atual', { ascending: true })
            .order('horario', { ascending: true })
            .range(from, from + BATCH - 1);

          if (filtroAcao) {
            q = q.ilike('solicitante', '%acao%');
          }

          const { data, error } = await q;

          if (error) throw error;
          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allData = [...allData, ...data];
            if (data.length < BATCH) hasMore = false;
            else from += BATCH;
          }
        }
        return allData;
      };

      const atendimentos = await fetchAllAtendimentos();

      if (!atendimentos || atendimentos.length === 0) {
        setMessage({ text: 'Nenhum atendimento encontrado no período selecionado.', type: 'error' });
        setAtendenteStats([]);
        setAtendimentosData([]);
        setStatusCounts({});
        return;
      }

      const pessoasMap = new Map<string, AtendenteStats>();

      const normalizarChave = (nome: string) => nome.trim().toUpperCase();

      const formatarNome = (nome: string) =>
        nome.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

      const getOrInitStats = (nomeOriginal: string) => {
        const chave = normalizarChave(nomeOriginal);
        if (!pessoasMap.has(chave)) {
          pessoasMap.set(chave, {
            nome: formatarNome(nomeOriginal),
            total: 0,
            concluidos: 0,
            cancelados: 0,
            coletas: 0,
            atendimentos: []
          });
        }
        return pessoasMap.get(chave)!;
      };

      atendimentos.forEach((atendimento: any) => {
        if (atendimento.atendente_nome) {
          const stats = getOrInitStats(atendimento.atendente_nome);
          stats.total++;
          if (atendimento.status === 'concluido') stats.concluidos++;
          if (atendimento.status === 'cancelado') stats.cancelados++;
          stats.atendimentos.push(atendimento);
        }

        if (atendimento.coletor_nome && atendimento.fotos_coletadas) {
          const stats = getOrInitStats(atendimento.coletor_nome);
          stats.coletas++;
        }
      });

      const statsArray = Array.from(pessoasMap.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      setAtendenteStats(statsArray);
      setAtendimentosData(atendimentos);

      const counts: Record<string, number> = { total: atendimentos.length };
      atendimentos.forEach((atendimento: any) => {
        counts[atendimento.status] = (counts[atendimento.status] || 0) + 1;
      });
      setStatusCounts(counts);

      setMessage({
        text: `Relatório gerado com sucesso! ${atendimentos.length} atendimentos encontrados.`,
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

  // Top performer collaborator
  const topPerformer = useMemo(() => {
    if (atendenteStats.length === 0) return null;
    return [...atendenteStats].sort((a, b) => (b.total + b.coletas) - (a.total + a.coletas))[0];
  }, [atendenteStats]);

  // Total coletas
  const totalColetasGeral = useMemo(() => {
    return atendenteStats.reduce((acc, s) => acc + s.coletas, 0);
  }, [atendenteStats]);

  // Max volume for progress bars
  const maxVolumeColaborador = useMemo(() => {
    if (atendenteStats.length === 0) return 1;
    return Math.max(...atendenteStats.map(s => s.total + s.coletas), 1);
  }, [atendenteStats]);

  // Filtered atendimentos for table
  const atendimentosFiltrados = useMemo(() => {
    let filtered = atendimentosData;

    // Filter by status chip
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }

    // Filter by expanded staff member
    if (atendenteExpandido) {
      filtered = filtered.filter(a =>
        a.atendente_nome === atendenteExpandido || a.coletor_nome === atendenteExpandido
      );
    }

    // Filter by search query
    if (searchTableQuery.trim()) {
      const q = searchTableQuery.toLowerCase().trim();
      filtered = filtered.filter(a =>
        (a.nome && a.nome.toLowerCase().includes(q)) ||
        (a.cpf && a.cpf.toLowerCase().includes(q)) ||
        (a.protocolo && a.protocolo.toLowerCase().includes(q)) ||
        (a.atendente_nome && a.atendente_nome.toLowerCase().includes(q)) ||
        (a.coletor_nome && a.coletor_nome.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [atendimentosData, status, atendenteExpandido, searchTableQuery]);

  return (
    <div className="space-y-8 font-sans max-w-[1700px] mx-auto pb-12">
      {/* Top Navigation & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <FiArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-bold uppercase tracking-wider">
              <FiBarChart2 className="w-3.5 h-3.5" /> Analytics & Relatórios
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Desempenho por Colaborador
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-2xl font-normal leading-relaxed">
            Painel consolidado de atendimentos, recepção e coletas biométricas por equipe.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {atendenteStats.length > 0 && (
            <button
              onClick={gerarPDFRelatorio}
              disabled={loadingPdf}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPdf ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <FiDownload className="w-4 h-4" />
                  <span>Exportar Relatório PDF</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Control Panel: Date Filters & Parameters */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
              <FiSliders className="w-4 h-4" />
            </div>
            <span>Parâmetros de Consulta</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Atalhos:</span>
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'semana', label: 'Últimos 7 dias' },
              { id: 'mes', label: 'Este Mês' },
              { id: 'completo', label: 'Período Total', icon: <FiDatabase className="w-3 h-3" /> },
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateRange(preset.id as any)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all duration-200 inline-flex items-center gap-1.5"
              >
                {preset.icon}
                {preset.label}
              </button>
            ))}

            <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => setFiltroAcao(!filtroAcao)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 border ${
                filtroAcao
                  ? 'bg-purple-100/80 text-purple-800 border-purple-300 ring-2 ring-purple-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
              }`}
            >
              <FiActivity className={`w-3.5 h-3.5 ${filtroAcao ? 'text-purple-700' : 'text-slate-400'}`} />
              {filtroAcao ? 'Apenas Ações Itinerantes' : 'Filtrar por Ações'}
            </button>
          </div>
        </div>

        {/* Date Inputs Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Data Inicial</label>
            <div className="relative">
              <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-semibold text-sm focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Data Final</label>
            <div className="relative">
              <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-semibold text-sm focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-sm rounded-2xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Consultando banco...</span>
                </>
              ) : (
                <>
                  <FiSearch className="w-4 h-4 text-emerald-400" />
                  <span>Gerar Análise do Período</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Feedback Message */}
        {message && (
          <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200/80 text-emerald-800'
              : 'bg-rose-50 border border-rose-200/80 text-rose-800'
          }`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <FiCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <FiXCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Results Dashboard Section */}
      {atendenteStats.length > 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Atendimentos */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atendimentos</span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <FiUsers className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-4xl font-black text-slate-900 tracking-tight">{atendimentosData.length}</span>
                <p className="text-xs font-medium text-slate-500">Registros em guichê / mesa</p>
              </div>
            </div>

            {/* Total Coletas */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coletas Biométricas</span>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <MdFingerprint className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-4xl font-black text-purple-700 tracking-tight">{totalColetasGeral}</span>
                <p className="text-xs font-medium text-slate-500">Fotografia e impressões</p>
              </div>
            </div>

            {/* Total Geral (Atend + Coletas) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-teal-300 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume de Trabalho</span>
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <FiLayers className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-4xl font-black text-teal-700 tracking-tight">{atendimentosData.length + totalColetasGeral}</span>
                <p className="text-xs font-medium text-slate-500">Ações concluídas acumuladas</p>
              </div>
            </div>

            {/* Top Performer Highlight */}
            {topPerformer && (
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-700 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <FiAward className="w-3.5 h-3.5" /> Maior Volume
                  </span>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <FiTrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white truncate" title={topPerformer.nome}>{topPerformer.nome}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-400">{topPerformer.total + topPerformer.coletas}</span>
                    <span className="text-xs text-slate-400 font-medium">ações totais</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section Title: Collaborators Grid */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiUsers className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">Produtividade por Colaborador</h2>
              <span className="ml-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                {atendenteStats.length} ativos
              </span>
            </div>
            {atendenteExpandido && (
              <button
                onClick={() => setAtendenteExpandido(null)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 inline-flex items-center gap-1.5"
              >
                <FiX className="w-3.5 h-3.5" /> Limpar filtro de colaborador ({atendenteExpandido})
              </button>
            )}
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {atendenteStats.map((stats) => {
              const volumeTotal = stats.total + stats.coletas;
              const percentualTotal = Math.round((volumeTotal / maxVolumeColaborador) * 100);
              const isSelected = atendenteExpandido === stats.nome;
              const isTop = topPerformer?.nome === stats.nome;

              return (
                <div
                  key={stats.nome}
                  className={`bg-white rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between relative group ${
                    isSelected
                      ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-500/10'
                      : 'border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:border-emerald-300'
                  }`}
                >
                  {isTop && (
                    <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                      <FiAward className="w-3 h-3 text-amber-500" /> Destaque
                    </span>
                  )}

                  <div className="space-y-5">
                    {/* Header info */}
                    <div className="flex items-center gap-4 pr-16">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm border transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200'
                      }`}>
                        {stats.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug truncate" title={stats.nome}>
                          {stats.nome}
                        </h3>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Membro da Equipe</span>
                      </div>
                    </div>

                    {/* Progress Bar Share */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Volume Relativo</span>
                        <span className="text-slate-800 font-bold">{volumeTotal} ações</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentualTotal}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-center">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Atend.</span>
                        <span className="text-xl font-black text-slate-800">{stats.total}</span>
                      </div>
                      <div className="space-y-0.5 border-x border-slate-200/60">
                        <span className="text-xs font-bold text-purple-500 uppercase tracking-wider block flex items-center justify-center gap-0.5">
                          <MdFingerprint className="w-3 h-3" /> Coletas
                        </span>
                        <span className="text-xl font-black text-purple-700">{stats.coletas}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block">Total</span>
                        <span className="text-xl font-black text-teal-700">{volumeTotal}</span>
                      </div>
                    </div>

                    {/* Concluídos vs Cancelados chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {stats.concluidos > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {stats.concluidos} concluídos
                        </span>
                      )}
                      {stats.cancelados > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                          <FiXCircle className="w-3.5 h-3.5 text-rose-500" /> {stats.cancelados} cancelados
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Filter action button */}
                  <div className="pt-5 mt-5 border-t border-slate-100">
                    <button
                      onClick={() => setAtendenteExpandido(isSelected ? null : stats.nome)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80'
                      }`}
                    >
                      <FiFilter className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Exibindo na Tabela (Clique p/ Limpar)' : 'Filtrar Registros na Tabela'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Data Table Section */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
            
            {/* Table Control Bar */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-lg">Registros Detalhados</h3>
                  {atendenteExpandido && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Filtrado por: {atendenteExpandido}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {atendimentosFiltrados.length} atendimento(s) encontrado(s) com os filtros ativos.
                </p>
              </div>

              {/* Instant Table Search Bar */}
              <div className="relative w-full md:w-80">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, CPF, protocolo ou atendente..."
                  value={searchTableQuery}
                  onChange={(e) => setSearchTableQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                />
                {searchTableQuery && (
                  <button
                    onClick={() => setSearchTableQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="px-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Status:</span>
              {[
                { label: 'Todos', value: '', count: statusCounts.total || 0, activeClass: 'bg-slate-900 text-white' },
                { label: 'Concluído', value: 'concluido', count: statusCounts.concluido || 0, activeClass: 'bg-emerald-600 text-white' },
                { label: 'Confirmado', value: 'confirmado', count: statusCounts.confirmado || 0, activeClass: 'bg-blue-600 text-white' },
                { label: 'Cancelado', value: 'cancelado', count: statusCounts.cancelado || 0, activeClass: 'bg-rose-600 text-white' },
                { label: 'Ausente', value: 'ausente', count: statusCounts.ausente || 0, activeClass: 'bg-amber-600 text-white' },
                { label: 'Bloqueado', value: 'bloqueado', count: statusCounts.bloqueado || 0, activeClass: 'bg-slate-600 text-white' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => setStatus(chip.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 border ${
                    status === chip.value
                      ? `${chip.activeClass} border-transparent shadow-sm`
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{chip.label}</span>
                  {chip.count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${status === chip.value ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'}`}>
                      {chip.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-y border-slate-200/80 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6">Atendente</th>
                    <th className="py-3.5 px-6">Coletor</th>
                    <th className="py-3.5 px-6">Protocolo</th>
                    <th className="py-3.5 px-6">Cidadão / Cliente</th>
                    <th className="py-3.5 px-6">CPF</th>
                    <th className="py-3.5 px-6">Data & Hora</th>
                    <th className="py-3.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {atendimentosFiltrados.length > 0 ? (
                    atendimentosFiltrados.map((atendimento) => (
                      <tr key={atendimento.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Atendente */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {(atendimento.atendente_nome || 'A')[0]}
                            </div>
                            <span className="font-bold text-slate-900">{atendimento.atendente_nome || 'Não informado'}</span>
                          </div>
                        </td>

                        {/* Coletor */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {atendimento.coletor_nome ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                              <MdFingerprint className="w-3.5 h-3.5 text-purple-600" />
                              {atendimento.coletor_nome}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>

                        {/* Protocolo */}
                        <td className="py-4 px-6 whitespace-nowrap font-mono text-xs">
                          {atendimento.protocolo ? (
                            <button
                              onClick={() => handleCopy(atendimento.protocolo)}
                              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                              title="Clique para copiar o protocolo"
                            >
                              <span>{atendimento.protocolo}</span>
                              {copiedText === atendimento.protocolo ? (
                                <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <FiCopy className="w-3 h-3 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>

                        {/* Nome do Cliente */}
                        <td className="py-4 px-6 whitespace-nowrap font-bold text-slate-900">
                          {atendimento.nome || 'Não informado'}
                        </td>

                        {/* CPF */}
                        <td className="py-4 px-6 whitespace-nowrap font-mono text-xs text-slate-600">
                          {formatCPF(atendimento.cpf)}
                        </td>

                        {/* Data / Hora */}
                        <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">{formatDate(atendimento.dia_atual)}</span>
                          <span className="text-slate-400 mx-1.5">•</span>
                          <span>{formatTime(atendimento.horario)}</span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            atendimento.status === 'concluido'
                              ? 'bg-emerald-100 text-emerald-800'
                              : atendimento.status === 'confirmado'
                              ? 'bg-blue-100 text-blue-800'
                              : atendimento.status === 'cancelado'
                              ? 'bg-rose-100 text-rose-800'
                              : atendimento.status === 'ausente'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              atendimento.status === 'concluido' ? 'bg-emerald-500' :
                              atendimento.status === 'confirmado' ? 'bg-blue-500' :
                              atendimento.status === 'cancelado' ? 'bg-rose-500' :
                              atendimento.status === 'ausente' ? 'bg-amber-500' : 'bg-slate-400'
                            }`} />
                            {atendimento.status ? atendimento.status.charAt(0).toUpperCase() + atendimento.status.slice(1) : '-'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FiSearch className="w-8 h-8 opacity-40 text-slate-400" />
                          <p className="font-semibold text-slate-600">Nenhum atendimento corresponde aos filtros aplicados.</p>
                          <button
                            onClick={() => {
                              setStatus('');
                              setAtendenteExpandido(null);
                              setSearchTableQuery('');
                            }}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Limpar todos os filtros da tabela
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
