'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  FiUsers,
  FiCalendar,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiArrowLeft,
  FiClock,
  FiActivity,
  FiDatabase
} from 'react-icons/fi';
import { MdFingerprint } from 'react-icons/md';

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
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [atendimentosData, setAtendimentosData] = useState<Atendimento[]>([]);
  const [atendenteStats, setAtendenteStats] = useState<AtendenteStats[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [atendenteExpandido, setAtendenteExpandido] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
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
      dataInicioStr = '2020-01-01'; // data inicial do sistema
    }

    setDataInicio(dataInicioStr);
    setDataFim(dataFimStr);
  };

  const toggleFiltroAcao = () => {
    setFiltroAcao(!filtroAcao);
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
        setMessage({ text: 'É necessário selecionar data inicial e final', type: 'error' });
        return;
      }

      // Busca paginada para superar o limite de 1000 registros do Supabase
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
        setMessage({ text: 'Nenhum atendimento encontrado no período selecionado', type: 'error' });
        setAtendenteStats([]); // Limpar stats anteriores se não houver resultados
        setAtendimentosData([]);
        setStatusCounts({});
        return;
      }

      // Processar dados por atendente (unificando Atendente e Coletor)
      const pessoasMap = new Map<string, AtendenteStats>();

      // Normaliza para maiúsculo como chave (evita duplicatas por capitalização)
      const normalizarChave = (nome: string) => nome.trim().toUpperCase();

      // Formata o nome em Title Case para exibição
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
        // Processar Atendente
        if (atendimento.atendente_nome) {
          const stats = getOrInitStats(atendimento.atendente_nome);
          stats.total++;
          if (atendimento.status === 'concluido') stats.concluidos++;
          if (atendimento.status === 'cancelado') stats.cancelados++;
          stats.atendimentos.push(atendimento);
        }

        // Processar Coletor (incrementar apenas contagem de coletas)
        if (atendimento.coletor_nome && atendimento.fotos_coletadas) {
          const stats = getOrInitStats(atendimento.coletor_nome);
          stats.coletas++;
        }
      });

      const statsArray = Array.from(pessoasMap.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      setAtendenteStats(statsArray);
      setAtendimentosData(atendimentos);

      // Calcular contadores de status
      const counts: Record<string, number> = { total: atendimentos.length };
      atendimentos.forEach((atendimento: any) => {
        counts[atendimento.status] = (counts[atendimento.status] || 0) + 1;
      });
      setStatusCounts(counts);

      setMessage({
        text: `Relatório gerado com sucesso! ${atendimentos.length} registros processados.`,
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

  const getAtendimentosFiltrados = () => {
    if (!status) return atendimentosData;
    return atendimentosData.filter(a => a.status === status);
  };

  // Efeito para recarregar quando o filtro de ação muda (se já houver datas)
  useEffect(() => {
    if (dataInicio && dataFim && !loading) {
      // Opcional: Auto-submit ou deixar usuário clicar?
    }
  }, [filtroAcao]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 pt-24 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <button
              onClick={() => router.back()}
              className="group flex items-center text-slate-500 hover:text-emerald-600 transition-all duration-200 mb-4 text-sm font-medium"
            >
              <FiArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              Voltar
            </button>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 tracking-tight">
              Atendimentos por Colaborador
            </h1>
            <p className="text-slate-500 mt-2 text-lg font-light">
              Acompanhe o desempenho detalhado de atendimentos e coletas biométricas.
            </p>
          </div>
        </div>

        {/* Filtros Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-700">
              <FiFilter className="w-5 h-5 text-emerald-500" />
              <h2 className="font-semibold text-lg">Filtros de Período</h2>
            </div>

            {/* Atalhos */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Atalhos:</span>
              <button
                type="button"
                onClick={() => setDateRange('hoje')}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDateRange('semana')}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
              >
                Última Semana
              </button>
              <button
                type="button"
                onClick={() => setDateRange('mes')}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
              >
                Último Mês
              </button>
              <button
                type="button"
                onClick={() => setDateRange('completo')}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all shadow-sm flex items-center gap-1.5"
              >
                <FiDatabase className="w-3 h-3" />
                Período Completo
              </button>
              <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>
              <button
                type="button"
                onClick={toggleFiltroAcao}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm flex items-center gap-2 ${filtroAcao
                  ? 'bg-purple-100 text-purple-700 border border-purple-200 ring-2 ring-purple-100 ring-offset-1'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200'
                  }`}
              >
                <FiActivity className={`w-3 h-3 ${filtroAcao ? 'text-purple-600' : 'text-slate-400'}`} />
                {filtroAcao ? 'Exibindo Apenas Ações' : 'Filtrar por Ações'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 w-full relative group">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block group-focus-within:text-emerald-600 transition-colors">Data Inicial</label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex-1 w-full relative group">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block group-focus-within:text-emerald-600 transition-colors">Data Final</label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <FiSearch className="w-5 h-5" />
                    <span>Gerar Relatório</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Mensagens */}
          {message && (
            <div className={`mx-6 mb-6 px-4 py-3 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
              {message.type === 'success' ? <FiCheckCircle className="w-5 h-5" /> : <FiXCircle className="w-5 h-5" />}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {atendenteStats.length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Resumo Geral */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 shadow-xl text-white border border-slate-700">
              <div className="mb-6 md:mb-0 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white">Resumo Geral</h2>
                <p className="text-slate-400 mt-1 text-sm">Desempenho de toda a equipe no período selecionado</p>
              </div>
              <div className="flex flex-wrap justify-center md:justify-end gap-4 w-full md:w-auto">
                <div className="bg-slate-800/50 px-6 py-4 rounded-2xl border border-slate-700/50 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Atendimentos</p>
                  <p className="text-5xl font-black text-emerald-400 drop-shadow-md">{atendimentosData.length}</p>
                </div>
                {atendenteStats.reduce((acc, curr) => acc + curr.coletas, 0) > 0 && (
                  <div className="bg-slate-800/50 px-6 py-4 rounded-2xl border border-slate-700/50 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                      <MdFingerprint className="w-3.5 h-3.5" /> Coletas
                    </p>
                    <p className="text-5xl font-black text-purple-400 drop-shadow-md">
                      {atendenteStats.reduce((acc, curr) => acc + curr.coletas, 0)}
                    </p>
                  </div>
                )}
                {atendenteStats.reduce((acc, curr) => acc + curr.coletas, 0) > 0 && (
                  <div className="bg-teal-900/40 px-6 py-4 rounded-2xl border border-teal-700/40 text-center">
                    <p className="text-xs font-bold text-teal-300 uppercase tracking-widest mb-1">Total Geral</p>
                    <p className="text-5xl font-black text-teal-300 drop-shadow-md">
                      {atendimentosData.length + atendenteStats.reduce((acc, curr) => acc + curr.coletas, 0)}
                    </p>
                    <p className="text-[10px] text-teal-500 font-semibold mt-1">atend. + coletas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {atendenteStats.map((stats, index) => (
                <div key={stats.nome} className="group bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors duration-300 border border-slate-100 group-hover:border-emerald-100">
                        <FiUsers className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-emerald-700 transition-colors">{stats.nome}</h3>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Colaborador</span>
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col">
                          <span className="text-4xl font-black text-slate-800 tracking-tighter">{stats.total}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase mt-1">Atendimentos</span>
                        </div>
                        <div className="flex flex-col border-l border-slate-100 pl-3">
                          <span className="text-4xl font-black text-purple-600 tracking-tighter">{stats.coletas}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">
                            <MdFingerprint className="w-3.5 h-3.5" /> Coletas
                          </span>
                        </div>
                        <div className="flex flex-col border-l border-slate-100 pl-3">
                          <span className="text-4xl font-black text-teal-600 tracking-tighter">{stats.total + stats.coletas}</span>
                          <span className="text-xs font-bold text-teal-400 uppercase mt-1">Total</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {stats.concluidos > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-100">
                          <FiCheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>{stats.concluidos} Concluídos</span>
                        </div>
                      )}
                      {stats.cancelados > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-100">
                          <FiXCircle className="w-4 h-4 text-red-400" />
                          <span>{stats.cancelados} Cancelados</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(stats.total > 0 || stats.coletas > 0) && (
                    <button
                      onClick={() => setAtendenteExpandido(atendenteExpandido === stats.nome ? null : stats.nome)}
                      className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${atendenteExpandido === stats.nome ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-100'}`}
                    >
                      <span>{atendenteExpandido === stats.nome ? 'Ocultar Tabela' : 'Filtrar na Tabela'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-3 py-4">
              <span className="text-sm font-semibold text-slate-500 mr-2">Filtrar Tabela:</span>
              {[
                { label: 'Todos', value: '', count: statusCounts.total, color: 'bg-slate-800 text-white' },
                { label: 'Confirmado', value: 'confirmado', count: statusCounts.confirmado, color: 'bg-blue-600 text-white' },
                { label: 'Concluído', value: 'concluido', count: statusCounts.concluido, color: 'bg-emerald-600 text-white' },
                { label: 'Cancelado', value: 'cancelado', count: statusCounts.cancelado, color: 'bg-red-500 text-white' },
                { label: 'Ausente', value: 'ausente', count: statusCounts.ausente, color: 'bg-amber-500 text-white' },
                { label: 'Bloqueado', value: 'bloqueado', count: statusCounts.bloqueado, color: 'bg-slate-500 text-white' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => setStatus(chip.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${status === chip.value
                    ? chip.color + ' ring-2 ring-offset-2 ring-emerald-100 scale-105'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {chip.label}
                  {chip.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${status === chip.value ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      {chip.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg">Detalhes dos Atendimentos</h3>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-500">
                  {getAtendimentosFiltrados().length} registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80">
                      {[
                        { label: 'Atendente', icon: <FiUsers className="w-3.5 h-3.5" /> },
                        { label: 'Coletor', icon: <MdFingerprint className="w-3.5 h-3.5" /> },
                        { label: 'Protocolo', icon: null },
                        { label: 'Cliente', icon: null },
                        { label: 'CPF', icon: null },
                        { label: 'Data/Hora', icon: <FiClock className="w-3.5 h-3.5" /> },
                        { label: 'Status', icon: <FiActivity className="w-3.5 h-3.5" /> }
                      ].map((header, idx) => (
                        <th key={idx} scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            {header.icon}
                            {header.label}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-50">
                    {getAtendimentosFiltrados()
                      .filter(atendimento => !atendenteExpandido ||
                        atendimento.atendente_nome === atendenteExpandido ||
                        atendimento.coletor_nome === atendenteExpandido
                      )
                      .map((atendimento) => (
                        <tr key={atendimento.id} className="hover:bg-emerald-50/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 mr-3 text-xs font-bold">
                                {(atendimento.atendente_nome || 'N')[0]}
                              </div>
                              <span className="text-sm font-semibold text-slate-700">{atendimento.atendente_nome || 'Não identificado'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {atendimento.coletor_nome ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                {atendimento.coletor_nome}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">
                            {atendimento.protocolo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                            {atendimento.nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                            {atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {formatDate(atendimento.dia_atual)} <span className="text-slate-400 mx-1">•</span> {formatTime(atendimento.horario)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${atendimento.status === 'confirmado' ? 'bg-blue-100 text-blue-700' :
                              atendimento.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' :
                                atendimento.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                                  atendimento.status === 'ausente' ? 'bg-amber-100 text-amber-700' :
                                    atendimento.status === 'bloqueado' ? 'bg-slate-200 text-slate-700' :
                                      'bg-slate-100 text-slate-600'
                              }`}>
                              {atendimento.status ? atendimento.status.charAt(0).toUpperCase() + atendimento.status.slice(1) : '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
