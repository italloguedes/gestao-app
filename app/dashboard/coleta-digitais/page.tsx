'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import { useTextToSpeech } from '@/components/TextToSpeech';

interface AtendimentoFila {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  protocolo: string;
  dia_atual: string;
  horario: string;
  status: string;
  fotos_coletadas: boolean;
  atendimento_preferencial?: boolean;
}

interface ChamadaDigital {
  id: number;
  atendimento_id: number;
  nome: string;
  cpf: string;
  status: string;
  data_hora_chamada: string;
  preferencial: boolean;
}

export default function ColetaDigitaisPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { speak } = useTextToSpeech();

  const [loading, setLoading] = useState(true);
  const [fila, setFila] = useState<AtendimentoFila[]>([]);
  const [chamadaAtual, setChamadaAtual] = useState<ChamadaDigital | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [processando, setProcessando] = useState(false);

  // Estatísticas
  const [stats, setStats] = useState({
    totalPendente: 0,
    preferenciaisPendentes: 0,
    coletadosHoje: 0
  });

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    // Auto-refresh a cada 10 segundos
    const interval = setInterval(() => {
      loadFila();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const checkAuthAndLoad = async () => {
    if (!user) {
      router.push('/');
      return;
    }

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single();

      if (error || !userData) {
        router.push('/');
        return;
      }

      if (!['admin', 'superadmin', 'atendente'].includes(userData.role)) {
        router.push('/agendamento');
        return;
      }

      await loadFila();
      await loadStats();
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      router.push('/');
    }
  };

  const loadFila = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('atendimentos')
        .select(`
          id,
          nome,
          cpf,
          email,
          protocolo,
          dia_atual,
          horario,
          status,
          fotos_coletadas
        `)
        .eq('dia_atual', hoje)
        .eq('fotos_coletadas', false)
        .order('horario', { ascending: true });

      if (error) throw error;

      // Buscar informação de preferencial dos agendamentos
      const atendimentosComPreferencial = await Promise.all(
        (data || []).map(async (atendimento) => {
          const { data: agendamento } = await supabase
            .from('agendamentos')
            .select('atendimento_preferencial')
            .eq('cpf', atendimento.cpf)
            .eq('data_agendamento', hoje)
            .single();

          return {
            ...atendimento,
            atendimento_preferencial: agendamento?.atendimento_preferencial || false
          };
        })
      );

      // Ordenar: preferenciais primeiro, depois por horário
      const filaOrdenada = atendimentosComPreferencial.sort((a, b) => {
        if (a.atendimento_preferencial && !b.atendimento_preferencial) return -1;
        if (!a.atendimento_preferencial && b.atendimento_preferencial) return 1;
        return a.horario.localeCompare(b.horario);
      });

      setFila(filaOrdenada);
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Total pendente
      const { count: pendente } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact', head: true })
        .eq('dia_atual', hoje)
        .eq('fotos_coletadas', false);

      // Coletados hoje
      const { count: coletados } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact', head: true })
        .eq('dia_atual', hoje)
        .eq('fotos_coletadas', true);

      setStats({
        totalPendente: pendente || 0,
        preferenciaisPendentes: fila.filter(a => a.atendimento_preferencial).length,
        coletadosHoje: coletados || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const chamarProximo = async () => {
    if (fila.length === 0) {
      alert('Não há pessoas na fila para coleta de digitais');
      return;
    }

    const proximo = fila[0];
    await chamarPessoa(proximo);
  };

  const chamarPessoa = async (atendimento: AtendimentoFila) => {
    try {
      setProcessando(true);

      // Buscar dados do atendente
      const { data: userData } = await supabase
        .from('users')
        .select('id, name')
        .eq('auth_id', user.id)
        .single();

      // Criar chamada
      const { data: chamada, error } = await supabase
        .from('chamada_digitais')
        .insert({
          atendimento_id: atendimento.id,
          nome: atendimento.nome,
          cpf: atendimento.cpf,
          status: 'chamado',
          atendente_id: user.id,
          atendente_nome: userData?.name || 'Não identificado',
          preferencial: atendimento.atendimento_preferencial || false
        })
        .select()
        .single();

      if (error) throw error;

      setChamadaAtual(chamada);
      setShowModal(true);

      // Síntese de voz
      const mensagem = atendimento.atendimento_preferencial
        ? `Chamada preferencial para coleta de digitais. ${atendimento.nome}, dirija-se ao atendimento.`
        : `Chamada para coleta de digitais. ${atendimento.nome}, dirija-se ao atendimento.`;

      speak(mensagem);

    } catch (error) {
      console.error('Erro ao chamar pessoa:', error);
      alert('Erro ao chamar pessoa. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  };

  const marcarComoColetado = async () => {
    if (!chamadaAtual) return;

    try {
      setProcessando(true);

      // Atualizar atendimento
      const { error: errorAtendimento } = await supabase
        .from('atendimentos')
        .update({ fotos_coletadas: true })
        .eq('id', chamadaAtual.atendimento_id);

      if (errorAtendimento) throw errorAtendimento;

      // Atualizar chamada
      const { error: errorChamada } = await supabase
        .from('chamada_digitais')
        .update({
          status: 'coletado',
          data_hora_coleta: new Date().toISOString(),
          observacoes: observacao || null
        })
        .eq('id', chamadaAtual.id);

      if (errorChamada) throw errorChamada;

      // Fechar modal e recarregar
      setShowModal(false);
      setChamadaAtual(null);
      setObservacao('');
      await loadFila();
      await loadStats();

    } catch (error) {
      console.error('Erro ao marcar como coletado:', error);
      alert('Erro ao marcar como coletado. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  };

  const marcarComoAusente = async () => {
    if (!chamadaAtual) return;

    try {
      setProcessando(true);

      const { error } = await supabase
        .from('chamada_digitais')
        .update({
          status: 'ausente',
          observacoes: observacao || 'Pessoa não compareceu'
        })
        .eq('id', chamadaAtual.id);

      if (error) throw error;

      setShowModal(false);
      setChamadaAtual(null);
      setObservacao('');
      await loadFila();

    } catch (error) {
      console.error('Erro ao marcar como ausente:', error);
      alert('Erro ao marcar como ausente. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  };

  const rechamar = () => {
    if (!chamadaAtual) return;

    const atendimento = fila.find(a => a.id === chamadaAtual.atendimento_id);
    if (atendimento) {
      const mensagem = atendimento.atendimento_preferencial
        ? `Chamada preferencial para coleta de digitais. ${atendimento.nome}, dirija-se ao atendimento.`
        : `Chamada para coleta de digitais. ${atendimento.nome}, dirija-se ao atendimento.`;

      speak(mensagem);
    }
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Fila de Coleta de Digitais
          </h1>
          <p className="text-sm text-gray-600">
            Gerencie a fila de coleta com prioridade para atendimentos preferenciais
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-3xl font-bold text-gray-900 font-mono">{stats.totalPendente}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Preferenciais</p>
                <p className="text-3xl font-bold text-amber-600 font-mono">{stats.preferenciaisPendentes}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Coletados Hoje</p>
                <p className="text-3xl font-bold text-green-600 font-mono">{stats.coletadosHoje}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Chamar Próximo */}
        <div className="mb-6">
          <button
            onClick={chamarProximo}
            disabled={fila.length === 0 || processando}
            className="w-full md:w-auto px-8 py-4 bg-emerald-600 text-white text-lg font-semibold rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {processando ? 'Chamando...' : 'Chamar Próximo da Fila'}
          </button>
        </div>

        {/* Tabela da Fila */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Fila de Espera
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({fila.length} pessoa{fila.length !== 1 ? 's' : ''} aguardando)
              </span>
            </h2>
          </div>

          {fila.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 font-medium">Nenhuma pessoa aguardando coleta de digitais</p>
              <p className="text-sm text-gray-400 mt-1">Todas as digitais do dia foram coletadas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posição
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPF
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horário
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prioridade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fila.map((atendimento, index) => (
                    <tr key={atendimento.id} className={`hover:bg-gray-50 ${atendimento.atendimento_preferencial ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-mono font-semibold text-gray-900">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{atendimento.nome}</div>
                        <div className="text-sm text-gray-500 font-mono">{atendimento.protocolo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {atendimento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatTime(atendimento.horario)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {atendimento.atendimento_preferencial ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            PREFERENCIAL
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-600">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => chamarPessoa(atendimento)}
                          disabled={processando}
                          className="text-emerald-600 hover:text-emerald-900 font-medium disabled:opacity-50"
                        >
                          Chamar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Chamada */}
      {showModal && chamadaAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl mx-4">
            {/* Header do Modal */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Pessoa Chamada
                </h2>
                {chamadaAtual.preferencial && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold border border-amber-300 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    PREFERENCIAL
                  </span>
                )}
              </div>

              {/* Informações da Pessoa */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-900">{chamadaAtual.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <span className="text-sm font-mono text-gray-700">{chamadaAtual.cpf}</span>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="mb-6">
              <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </label>
              <textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-sm"
                placeholder="Adicione observações sobre a coleta..."
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={rechamar}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                Chamar Novamente
              </button>
              <button
                onClick={marcarComoAusente}
                disabled={processando}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Ausente
              </button>
              <button
                onClick={marcarComoColetado}
                disabled={processando}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {processando ? 'Salvando...' : 'Digitais Coletadas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
