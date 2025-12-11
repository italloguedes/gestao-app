'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';

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
        setMessage({ text: 'É necessário selecionar data inicial e final', type: 'error' });
        return;
      }

      let query = supabase
        .from('atendimentos')
        .select('*');

      const dataInicioAjustada = dataInicio + 'T00:00:00';
      const dataFimAjustada = dataFim + 'T23:59:59';
      query = query
        .gte('dia_atual', dataInicioAjustada)
        .lte('dia_atual', dataFimAjustada);

      query = query.order('atendente_nome', { ascending: true })
        .order('dia_atual', { ascending: true })
        .order('horario', { ascending: true });

      const { data: atendimentos, error } = await query;

      if (error) {
        console.error('Erro ao buscar atendimentos:', error);
        setMessage({ text: 'Erro ao buscar atendimentos: ' + error.message, type: 'error' });
        return;
      }

      if (!atendimentos || atendimentos.length === 0) {
        setMessage({ text: 'Nenhum atendimento encontrado no período selecionado', type: 'error' });
        return;
      }

      // Processar dados por atendente (unificando Atendente e Coletor)
      const pessoasMap = new Map<string, AtendenteStats>();

      const getOrInitStats = (nome: string) => {
        if (!pessoasMap.has(nome)) {
          pessoasMap.set(nome, {
            nome: nome,
            total: 0,
            concluidos: 0,
            cancelados: 0,
            coletas: 0,
            atendimentos: []
          });
        }
        return pessoasMap.get(nome)!;
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
          // Não adicionamos ao array de atendimentos aqui para não duplicar na visualização,
          // pois o atendimento já foi adicionado pelo atendente_nome.
          // Se o coletor for diferente do atendente, ele aparecerá na lista de cards mas os detalhes
          // mostrarão apenas os atendimentos onde ele foi o ATENDENTE principal,
          // mas o contador de coletas estará correto.
        }
      });

      const statsArray = Array.from(pessoasMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Atendimentos por Atendente
          </h1>
          <p className="text-sm text-gray-600">
            Visualize métricas e desempenho individual dos atendentes e coletores
          </p>
        </div>

        {/* Formulário de Filtros */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Período</h2>
          </div>

          {/* Mensagens de feedback */}
          {message && (
            <div className={`mx-6 mt-4 p-4 border rounded-lg ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
              }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Data Inicial */}
              <div>
                <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inicial
                </label>
                <input
                  type="date"
                  id="dataInicio"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono text-sm"
                  required
                />
              </div>

              {/* Data Final */}
              <div>
                <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-2">
                  Data Final
                </label>
                <input
                  type="date"
                  id="dataFim"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono text-sm"
                  required
                />
              </div>
            </div>

            {/* Botão de ação */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Carregando dados...
                  </span>
                ) : (
                  <span>Gerar Relatório</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Cards de Métricas por Atendente */}
        {atendenteStats.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {atendenteStats.map((stats) => (
                <div key={stats.nome} className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{stats.nome}</h3>
                      <p className="text-sm text-gray-500 mt-1">Colaborador</p>
                    </div>
                    <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-mono font-semibold">
                      Rank #{atendenteStats.indexOf(stats) + 1}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Atendimentos</span>
                      <span className="text-sm font-mono font-semibold text-gray-900">{stats.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Coletas</span>
                      <span className="text-sm font-mono font-semibold text-purple-600">{stats.coletas}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Concluídos</span>
                      <span className="text-sm font-mono font-semibold text-green-600">{stats.concluidos}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cancelados</span>
                      <span className="text-sm font-mono font-semibold text-red-600">{stats.cancelados}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Taxa de Conclusão</span>
                      <span className="text-sm font-mono font-semibold text-emerald-600">
                        {stats.total > 0 ? Math.round((stats.concluidos / stats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {stats.total > 0 && (
                    <button
                      onClick={() => setAtendenteExpandido(atendenteExpandido === stats.nome ? null : stats.nome)}
                      className="mt-4 w-full px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      {atendenteExpandido === stats.nome ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Filtros de Status (Chips) */}
            <div className="bg-white border border-gray-200 rounded-lg mb-6">
              <div className="px-6 py-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Filtrar por Status</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatus('')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === ''
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    Todos
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                      {statusCounts.total || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setStatus('confirmado')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'confirmado'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    Confirmado
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                      {statusCounts.confirmado || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setStatus('concluido')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'concluido'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    Concluído
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                      {statusCounts.concluido || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setStatus('cancelado')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'cancelado'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    Cancelado
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                      {statusCounts.cancelado || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setStatus('ausente')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'ausente'
                      ? 'bg-yellow-600 text-white border-yellow-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    Ausente
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                      {statusCounts.ausente || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setStatus('bloqueado')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${status === 'bloqueado'
                      ? 'bg-gray-600 text-white border-gray-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    Bloqueado
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                      {statusCounts.bloqueado || 0}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Atendimentos */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Detalhes dos Atendimentos
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({getAtendimentosFiltrados().length} registros)
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Atendente
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Coleta Por
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Protocolo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CPF
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getAtendimentosFiltrados()
                      .filter(atendimento => !atendenteExpandido ||
                        atendimento.atendente_nome === atendenteExpandido ||
                        atendimento.coletor_nome === atendenteExpandido
                      )
                      .map((atendimento) => (
                        <tr key={atendimento.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {atendimento.atendente_nome || 'Não identificado'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                            {atendimento.coletor_nome || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {atendimento.protocolo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {atendimento.nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {formatDate(atendimento.dia_atual)} {formatTime(atendimento.horario)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${atendimento.status === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                              atendimento.status === 'concluido' ? 'bg-green-100 text-green-800' :
                                atendimento.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                                  atendimento.status === 'ausente' ? 'bg-yellow-100 text-yellow-800' :
                                    atendimento.status === 'bloqueado' ? 'bg-gray-100 text-gray-800' :
                                      'bg-gray-100 text-gray-800'
                              }`}>
                              {atendimento.status.charAt(0).toUpperCase() + atendimento.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
