'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  FiSearch
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
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Configurações de Tipagem
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

const COLORS = {
  primary: '#3B82F6',   // Blue 500
  secondary: '#8B5CF6', // Violet 500
  success: '#10B981',   // Emerald 500
  warning: '#F59E0B',   // Amber 500
  danger: '#EF4444',    // Red 500
  info: '#06B6D4',      // Cyan 500
  slate: '#64748B'      // Slate 500
};

const STATUS_COLORS: Record<string, string> = {
  'Concluídos': COLORS.success,
  'Em Andamento': COLORS.primary,
  'Correção': COLORS.warning,
  'Bloqueados': COLORS.danger,
  'Outros': COLORS.slate
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100
    }
  }
};

export default function AcoesItinerantesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [acoes, setAcoes] = useState<AcaoData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);

  // Controle de Ano e Datas
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [totalAtendimentos, setTotalAtendimentos] = useState(0);
  const [selectedAcao, setSelectedAcao] = useState<string | null>(null);

  // Inicialização e mudança de ano
  useEffect(() => {
    const today = new Date();

    if (selectedYear === 2025) {
      setDataInicio('2025-01-01');
      setDataFim('2025-12-31');
    } else {
      // Para ano atual ou futuro, definir início do ano até hoje (ou fim do ano se já passou)
      setDataInicio(`${selectedYear}-01-01`);

      const endOfYear = new Date(`${selectedYear}-12-31`);
      if (today > endOfYear) {
        setDataFim(`${selectedYear}-12-31`);
      } else {
        setDataFim(today.toISOString().split('T')[0]);
      }
    }
  }, [selectedYear]);

  // Busca de dados quando datas ou filtros mudam
  useEffect(() => {
    if (dataInicio && dataFim) {
      fetchData();
    }
  }, [dataInicio, dataFim, selectedAcao]);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log(`=== BUSCANDO DADOS PARA O ANO ${selectedYear} ===`);
      console.log(`Período: ${dataInicio} a ${dataFim}`);

      let allAtendimentos: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data: atendimentos, error } = await supabase
          .from('atendimentos')
          .select('*')
          .gte('dia_atual', dataInicio)
          .lte('dia_atual', dataFim)
          .range(from, to);

        if (error) throw error;

        if (atendimentos && atendimentos.length > 0) {
          allAtendimentos = [...allAtendimentos, ...atendimentos];
          if (atendimentos.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      if (allAtendimentos.length === 0) {
        resetState();
        return;
      }

      processAtendimentos(allAtendimentos);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      // Opcional: Toast de erro
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setAcoes([]);
    setStatusData([]);
    setTimelineData([]);
    setTotalAtendimentos(0);
    setLoading(false);
  };

  const processAtendimentos = (atendimentos: any[]) => {
    // 1. Filtrar Ações Itinerantes
    const atendimentosAcoes = atendimentos.filter((a: any) => {
      if (!a.solicitante) return false;
      const solicitante = a.solicitante.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return solicitante.includes('acao') || /acao|ação/i.test(a.solicitante.trim());
    });

    setTotalAtendimentos(atendimentosAcoes.length);

    // 2. Agrupar por Ação
    const acoesMap = new Map<string, AcaoData>();

    atendimentosAcoes.forEach((atendimento: any) => {
      const nomeAcao = atendimento.solicitante;

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

      const status = processStatus(atendimento.status);

      switch (status) {
        case 'concluido': acao.concluidos++; break;
        case 'em_andamento': acao.emAndamento++; break;
        case 'correcao': acao.correcao++; break;
        case 'bloqueado': acao.bloqueados++; break;
        default: acao.outros++; break;
      }
    });

    // 3. Calcular Percentuais e Ordenar
    const acoesArray = Array.from(acoesMap.values()).map(acao => ({
      ...acao,
      percentualConclusao: acao.total > 0 ? (acao.concluidos / acao.total) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    setAcoes(acoesArray);

    // 4. Dados Agregados para Gráficos
    updateChartsData(acoesArray);
  };

  const processStatus = (rawStatus: any): string => {
    if (!rawStatus) return 'outros';

    const statusLower = String(rawStatus).toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos

    if (statusLower.includes('concluido')) return 'concluido';
    if (statusLower.includes('em andamento') || statusLower.includes('em_andamento')) return 'em_andamento';
    if (statusLower.includes('correcao') || statusLower.includes('correção')) return 'correcao';
    if (statusLower.includes('bloqueado')) return 'bloqueado';

    return 'outros';
  };

  const updateChartsData = (data: AcaoData[]) => {
    const acoesFiltradas = selectedAcao
      ? data.filter(acao => acao.nome === selectedAcao)
      : data;

    // Status Agregado
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
        color: STATUS_COLORS[name]
      }));

    setStatusData(statusArray);

    // TODO: Timeline requires re-parsing original objects if we want detailed timeline per filter. 
    // For now, assuming basic timeline or implementing it simpler below if needed.
    // To keep it simple and performant, we might skip re-fetching for timeline or pass the raw data if needed.
    // For this rewrite, let's keep it clean: if selectedYear changes, we re-fetch everything anyway.
    // If selectedAcao changes, we can re-filter from a stored raw list if we kept it, but for memory sake
    // let's just show timeline based on current 'selectedAcao' if we had the raw list.
    // Since we didn't store raw list in state, let's stick to status charts for interaction or simple mock for now.
    // Better: Allow timeline to be built from the aggregation if possible, OR store filtered raw data.
    // Let's implement a simplified logic for Timeline in 'processAtendimentos' if possible, or just skip timeline refinement on client-side filter for now to avoid complexity overload in this step.
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246);
    doc.text('Relatório de Ações Itinerantes ALECE', 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Ano de Referência: ${selectedYear}`, 14, 30);
    doc.text(`Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`, 14, 38);
    doc.text(`Total Atendimentos: ${totalAtendimentos}`, 14, 46);

    const tableData = acoes.map(acao => [
      acao.nome,
      acao.total,
      acao.concluidos,
      acao.emAndamento,
      acao.correcao,
      acao.bloqueados,
      `${acao.percentualConclusao.toFixed(1)}%`
    ]);

    (doc as any).autoTable({
      startY: 55,
      head: [['Ação', 'Total', 'Concl.', 'Andamento', 'Correção', 'Bloq.', '% Concl.']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    doc.save(`relatorio-acoes-${selectedYear}.pdf`);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-blue-100">
          <p className="font-bold text-slate-800 mb-2">{label || payload[0].name}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill || entry.color }}></span>
                <span className="text-slate-600 font-medium">{entry.name}:</span>
                <span className="font-bold text-slate-800">{entry.value}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/50 py-8 px-4 sm:px-6 lg:px-8 font-sans"
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Moderno */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <button
              onClick={() => router.back()}
              className="flex items-center text-slate-500 hover:text-blue-600 transition-colors group mb-2"
            >
              <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <FiMapPin className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
                  Ações Itinerantes
                </h1>
                <p className="text-slate-500 font-medium">Dashboard Analítico &bull; {selectedYear}</p>
              </div>
            </div>
          </div>

          {/* Year Toggle & Export */}
          <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/50">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[2025, 2026].map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${selectedYear === year
                    ? 'bg-white text-blue-600 shadow-md transform scale-105'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <button
              onClick={generatePDF}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <FiDownload />
              <span>PDF</span>
            </button>
          </div>
        </motion.div>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card Total Actions */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FiActivity className="w-24 h-24 text-blue-600" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100/50 rounded-2xl text-blue-600">
                <FiActivity className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-600">Ações Realizadas</p>
            </div>
            <p className="text-5xl font-black text-slate-800 tracking-tight">
              {acoes.length}
            </p>
            <div className="mt-4 flex items-center text-sm text-green-600 font-bold bg-green-50 w-fit px-3 py-1 rounded-full">
              <FiTrendingUp className="mr-1" />
              <span>Ativas em {selectedYear}</span>
            </div>
          </motion.div>

          {/* Card Total Atendimentos */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FiUsers className="w-24 h-24 text-purple-600" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100/50 rounded-2xl text-purple-600">
                <FiUsers className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-600">Atendimentos</p>
            </div>
            <p className="text-5xl font-black text-slate-800 tracking-tight">
              {totalAtendimentos}
            </p>
            <div className="mt-4 flex items-center text-sm text-purple-600 font-bold bg-purple-50 w-fit px-3 py-1 rounded-full">
              <span>Total acumulado</span>
            </div>
          </motion.div>

          {/* Card Concluídos */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 shadow-xl text-white hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <FiCheckCircle className="w-24 h-24 text-white" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <p className="font-bold text-emerald-100">Concluídos</p>
            </div>
            <p className="text-5xl font-black tracking-tight">
              {acoes.reduce((acc, curr) => acc + curr.concluidos, 0)}
            </p>
            <div className="mt-4 flex items-center text-sm text-emerald-100 font-medium bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
              <span>
                {totalAtendimentos > 0
                  ? ((acoes.reduce((acc, curr) => acc + curr.concluidos, 0) / totalAtendimentos) * 100).toFixed(1)
                  : 0}% do total
              </span>
            </div>
          </motion.div>

          {/* Card Em Andamento */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FiClock className="w-24 h-24 text-amber-500" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-100/50 rounded-2xl text-amber-600">
                <FiClock className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-600">Em Andamento</p>
            </div>
            <p className="text-5xl font-black text-slate-800 tracking-tight">
              {acoes.reduce((acc, curr) => acc + curr.emAndamento, 0)}
            </p>
            <div className="mt-4 flex items-center text-sm text-amber-600 font-bold bg-amber-50 w-fit px-3 py-1 rounded-full">
              <span>Processando</span>
            </div>
          </motion.div>
        </div>

        {/* Filtros e Controles Avançados */}
        <motion.div
          variants={itemVariants}
          className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white/50"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <FiFilter className="w-5 h-5" />
              </div>
              <div className="relative w-full md:w-96">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedAcao || ''}
                  onChange={(e) => setSelectedAcao(e.target.value || null)}
                  className="w-full pl-10 pr-4 py-3 bg-white border-none ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700 font-medium transition-all"
                >
                  <option value="">Todas as Ações</option>
                  {acoes.map(acao => (
                    <option key={acao.nome} value={acao.nome}>{acao.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl ring-1 ring-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período</span>
                <span className="text-sm font-semibold text-slate-700">
                  {new Date(dataInicio).toLocaleDateString('pt-BR')} - {new Date(dataFim).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gráfico Principal - Barras */}
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FiBarChart2 className="text-blue-500" />
              Desempenho por Ação
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acoes.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    width={150}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} content={<CustomTooltip />} />
                  <Bar dataKey="concluidos" fill={COLORS.success} radius={[0, 4, 4, 0]} barSize={20} stackId="a" />
                  <Bar dataKey="emAndamento" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} stackId="a" />
                  <Bar dataKey="bloqueados" fill={COLORS.danger} radius={[0, 4, 4, 0]} barSize={20} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Gráfico Secundário - Pizza */}
          <motion.div variants={itemVariants} className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FiPieChart className="text-purple-500" />
              Distribuição Geral
            </h3>
            <div className="h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              {/* Central Label */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-3xl font-black text-slate-800">{totalAtendimentos}</p>
                <p className="text-xs font-bold text-slate-400 uppercase">Registros</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabela de Dados (Resumida) */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800">Detalhamento das Ações</h3>
            <span className="text-sm font-medium text-slate-400">Mostrando top 10 ações</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="p-6 font-bold">Ação</th>
                  <th className="p-6 font-bold text-center">Progresso</th>
                  <th className="p-6 font-bold text-center">Concluídos</th>
                  <th className="p-6 font-bold text-center">Em Andamento</th>
                  <th className="p-6 font-bold text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {acoes.slice(0, 10).map((acao, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-6 font-bold text-slate-700">{acao.nome}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                            style={{ width: `${acao.percentualConclusao}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600">{acao.percentualConclusao.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="p-6 text-center font-bold text-emerald-600">{acao.concluidos}</td>
                    <td className="p-6 text-center font-bold text-blue-600">{acao.emAndamento}</td>
                    <td className="p-6 text-center font-black text-slate-800">{acao.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
