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
import 'jspdf-autotable';

interface AcaoData {
  nome: string;
  total: number;
  concluidos: number;
  emAndamento: number;
  correcao: number;
  bloqueados: number;
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
  'Cancelado': '#6B7280'
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

  useEffect(() => {
    // Definir datas padrão (últimos 180 dias para capturar mais dados históricos)
    const hoje = new Date();
    const diasAtras = new Date();
    diasAtras.setDate(hoje.getDate() - 180);

    setDataFim(hoje.toISOString().split('T')[0]);
    setDataInicio(diasAtras.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      fetchData();
    }
  }, [dataInicio, dataFim]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar todos os atendimentos do período
      let query = supabase
        .from('atendimentos')
        .select('*')
        .gte('dia_atual', dataInicio)
        .lte('dia_atual', dataFim);

      const { data: atendimentos, error } = await query;

      if (error) throw error;

      if (!atendimentos) {
        setAcoes([]);
        setStatusData([]);
        setTimelineData([]);
        setTotalAtendimentos(0);
        return;
      }

      // Filtrar apenas atendimentos que são de ações (solicitante contém "ação" ou "acao")
      const atendimentosAcoes = atendimentos.filter((a: any) => {
        if (!a.solicitante) return false;
        const solicitanteLower = a.solicitante.toLowerCase().trim();
        // Verificar se contém "ação" ou "acao" em qualquer parte do texto
        return solicitanteLower.includes('ação') || solicitanteLower.includes('acao');
      });

      setTotalAtendimentos(atendimentosAcoes.length);

      // Agrupar por ação
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
            percentualConclusao: 0
          });
        }

        const acao = acoesMap.get(nomeAcao)!;
        acao.total++;

        const status = atendimento.status?.toLowerCase();
        if (status === 'concluído' || status === 'concluido') {
          acao.concluidos++;
        } else if (status === 'em_andamento' || status === 'em andamento') {
          acao.emAndamento++;
        } else if (status === 'correcao' || status === 'correção') {
          acao.correcao++;
        } else if (status === 'bloqueado') {
          acao.bloqueados++;
        }
      });

      // Calcular percentuais e ordenar
      const acoesArray = Array.from(acoesMap.values()).map(acao => ({
        ...acao,
        percentualConclusao: acao.total > 0 ? (acao.concluidos / acao.total) * 100 : 0
      })).sort((a, b) => b.total - a.total);

      setAcoes(acoesArray);

      // Dados para gráfico de status (consolidado ou por ação)
      const filteredAtendimentos = selectedAcao
        ? atendimentosAcoes.filter((a: any) => a.solicitante === selectedAcao)
        : atendimentosAcoes;

      const statusMap = new Map<string, number>();
      filteredAtendimentos.forEach((atendimento: any) => {
        const status = atendimento.status || 'Não definido';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusArray: StatusData[] = Array.from(statusMap.entries()).map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name] || '#6B7280'
      }));

      setStatusData(statusArray);

      // Dados para timeline (atendimentos por dia)
      const timelineMap = new Map<string, number>();
      filteredAtendimentos.forEach((atendimento: any) => {
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
      `${acao.percentualConclusao.toFixed(1)}%`
    ]);

    (doc as any).autoTable({
      startY: 45,
      head: [['Ação', 'Total', 'Concluídos', 'Em Andamento', 'Correção', 'Bloqueados', '% Conclusão']],
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

            <button
              onClick={generatePDF}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <FiDownload className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-200" />
              Exportar PDF
            </button>
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
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">% Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {acoes.map((acao, index) => (
                  <tr
                    key={acao.nome}
                    className={`border-b border-slate-100 hover:bg-blue-50 transition-colors duration-150 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
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
