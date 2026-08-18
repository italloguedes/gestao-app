'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import { registrarHistorico } from '@/lib/historico-utils';

interface AtendimentoFila {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  protocolo?: string;
  telefone?: string;
  dia_atual: string;
  horario: string;
  status: string;
  fotos_coletadas: boolean;
  atendimento_preferencial?: boolean;
  pessoa_incapaz?: boolean;
}

interface ChamadaDigital {
  chamada_id: number;
  atendimento_id: number;
  agendamento_id: number;
  nome: string;
  cpf: string;
  protocolo: string;
  status: string;
  data_hora_chamada: string;
  preferencial: boolean;
  pessoa_incapaz: boolean;
  atendente_id: string;
  atendente_nome: string;
}

export default function ColetaDigitaisPage() {
  const router = useRouter();
  const { user } = useAuth();

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
    // Auto-refresh a cada 3 segundos (reduzido de 10s para melhor responsividade)
    const interval = setInterval(() => {
      loadFila();
      loadStats();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Configurar sincronização em tempo real para atendimentos
    // Quando qualquer atendente chama alguém, todos veem a atualização
    const channel = supabase
      .channel('atendimentos_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Escutar apenas UPDATEs
          schema: 'public',
          table: 'atendimentos',
          filter: 'fotos_coletadas=eq.false' // Apenas atendimentos pendentes
        },
        (payload: any) => {
          // Recarregar fila quando houver mudanças
          loadFila();
          loadStats();
        }
      )
      .subscribe();

    // Limpar ao desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuthAndLoad = async () => {
    if (!user) {
      router.push('/');
      return;
    }

    // Use metadata for role check instead of querying database
    const userRole = user.user_metadata?.role || user.app_metadata?.role || 'user';

    if (!['admin', 'superadmin', 'atendente'].includes(userRole)) {
      router.push('/agendamento');
      return;
    }

    await loadFila();
    await loadStats();

  };

  // Helper para obter data de hoje no fuso local (evita bug de mudar de dia após 21h UTC)
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Consultar globalmente no banco qual foi o tipo da última chamada de coleta realizada hoje
  const getUltimoTipoChamadoGlobal = async (): Promise<'preferencial' | 'normal' | null> => {
    try {
      const hoje = getTodayDateString();
      const { data } = await supabase
        .from('atendimentos')
        .select('atendimento_preferencial, updated_at')
        .eq('dia_atual', hoje)
        .or('status.eq.chamando,fotos_coletadas.eq.true')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        return data[0].atendimento_preferencial ? 'preferencial' : 'normal';
      }
    } catch (err) {
      console.error('Erro ao consultar histórico global de chamadas:', err);
    }
    const local = localStorage.getItem('coleta_ultimo_tipo_chamado');
    if (local === 'preferencial' || local === 'normal') return local;
    return null;
  };

  const loadFila = async () => {
    try {
      const hoje = getTodayDateString();

      // Buscar atendimentos pendentes de coleta
      // Exclui quem está com status 'chamando' (já sendo atendido por outro atendente)
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
          fotos_coletadas,
          atendimento_preferencial,
          pessoa_incapaz
        `)
        .eq('dia_atual', hoje)
        .eq('status', 'em_andamento')  // Status correto quando atendimento é criado
        .eq('fotos_coletadas', false)
        .order('horario', { ascending: true }); // Ordenar apenas por horário inicialmente

      if (error) throw error;

      const rawData = data || [];

      // Separar em duas filas com check explícito de boolean
      const preferenciais = rawData.filter((a: any) => a.atendimento_preferencial === true);
      const normais = rawData.filter((a: any) => !a.atendimento_preferencial || a.atendimento_preferencial === false);

      // Descobrir qual foi a última chamada global no posto para iniciar a alternância correta
      const ultimoTipoGlobal = await getUltimoTipoChamadoGlobal();

      // Se o último chamado no posto foi Preferencial, o próximo do turno deve ser Normal (false)
      // Se o último chamado foi Normal (ou ninguém), começa com Preferencial (true)
      let turnoPreferencial = ultimoTipoGlobal === 'preferencial' ? false : true;

      const filaIntercalada: any[] = [];
      let prefIndex = 0;
      let normIndex = 0;

      while (prefIndex < preferenciais.length || normIndex < normais.length) {
        if (turnoPreferencial) {
          // Turno do preferencial
          if (prefIndex < preferenciais.length) {
            filaIntercalada.push(preferenciais[prefIndex]);
            prefIndex++;
          } else if (normIndex < normais.length) {
            // Não há mais preferenciais, pega normal
            filaIntercalada.push(normais[normIndex]);
            normIndex++;
          }
        } else {
          // Turno do normal
          if (normIndex < normais.length) {
            filaIntercalada.push(normais[normIndex]);
            normIndex++;
          } else if (prefIndex < preferenciais.length) {
            // Não há mais normais, pega preferencial
            filaIntercalada.push(preferenciais[prefIndex]);
            prefIndex++;
          }
        }
        turnoPreferencial = !turnoPreferencial; // Alterna o turno
      }

      // Mapear para o formato esperado pela interface
      const atendimentosMapeados = filaIntercalada.map((atendimento: any) => ({
        id: atendimento.id,
        nome: atendimento.nome,
        cpf: atendimento.cpf,
        email: atendimento.email || '',
        telefone: '',  // Tabela atendimentos não tem telefone
        protocolo: atendimento.protocolo || '',
        dia_atual: atendimento.dia_atual,
        horario: atendimento.horario,
        status: atendimento.status,
        fotos_coletadas: atendimento.fotos_coletadas || false,
        atendimento_preferencial: atendimento.atendimento_preferencial === true,
        pessoa_incapaz: atendimento.pessoa_incapaz === true
      }));

      setFila(atendimentosMapeados);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const hoje = getTodayDateString();

      // Total pendente (atendimentos em andamento sem fotos)
      const { count: pendente } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact', head: true })
        .eq('dia_atual', hoje)
        .eq('status', 'em_andamento')
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
    }
  };

  const chamarProximo = async () => {
    try {
      setProcessando(true);

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/coleta/chamar-proximo', {
        method: 'POST',
        headers
      });

      const resData = await response.json();

      if (!response.ok) {
        alert(resData.message || resData.error || 'Erro ao chamar próximo');
        return;
      }

      const pessoa = resData.data;

      const chamadaFormatada: ChamadaDigital = {
        chamada_id: pessoa.id,
        atendimento_id: pessoa.id,
        agendamento_id: pessoa.id,
        nome: pessoa.nome,
        cpf: pessoa.cpf,
        protocolo: pessoa.protocolo || '',
        status: 'chamando',
        data_hora_chamada: new Date().toISOString(),
        preferencial: pessoa.atendimento_preferencial === true,
        pessoa_incapaz: pessoa.pessoa_incapaz === true,
        atendente_id: user?.id || '',
        atendente_nome: user?.user_metadata?.name || user?.user_metadata?.full_name || 'Atendente'
      };

      setChamadaAtual(chamadaFormatada);
      setShowModal(true);

      await loadFila();
      await loadStats();

    } catch (error: any) {
      alert('Erro ao chamar próximo: ' + (error.message || 'Tente novamente'));
    } finally {
      setProcessando(false);
    }
  };

  const chamarPessoa = async (atendimento: AtendimentoFila) => {
    try {
      setProcessando(true);

      // Persistir o tipo que está sendo chamado (para manter alternância)
      localStorage.setItem(
        'coleta_ultimo_tipo_chamado',
        atendimento.atendimento_preferencial ? 'preferencial' : 'normal'
      );

      // Mudar status para 'chamando'
      const { error: updateError } = await supabase
        .from('atendimentos')
        .update({ status: 'chamando' })
        .eq('id', atendimento.id);

      if (updateError) {
        throw updateError;
      }

      // Criar objeto da chamada para o modal com a flag de preferencial correta
      const chamadaFormatada: ChamadaDigital = {
        chamada_id: atendimento.id,
        atendimento_id: atendimento.id,
        agendamento_id: atendimento.id,
        nome: atendimento.nome,
        cpf: atendimento.cpf,
        protocolo: atendimento.protocolo || '',
        status: 'chamando',
        data_hora_chamada: new Date().toISOString(),
        preferencial: atendimento.atendimento_preferencial === true,
        pessoa_incapaz: atendimento.pessoa_incapaz === true,
        atendente_id: user?.id || '',
        atendente_nome: user?.user_metadata?.name || user?.user_metadata?.full_name || 'Atendente'
      };

      setChamadaAtual(chamadaFormatada);
      setShowModal(true);

      await loadFila();
      await loadStats();

    } catch (error: any) {
      alert('Erro ao chamar pessoa: ' + (error.message || 'Tente novamente'));
    } finally {
      setProcessando(false);
    }
  };

  const cancelarChamada = async () => {
    try {
      setProcessando(true);
      if (chamadaAtual) {
        // Restaurar status para 'em_andamento' para poder ser chamado novamente
        await supabase
          .from('atendimentos')
          .update({ status: 'em_andamento' })
          .eq('id', chamadaAtual.atendimento_id);
      }
    } catch (err) {
      console.error('Erro ao cancelar chamada:', err);
    } finally {
      setShowModal(false);
      setChamadaAtual(null);
      setObservacao('');
      setProcessando(false);
      await loadFila();
      await loadStats();
    }
  };

  const marcarComoColetado = async () => {
    if (!chamadaAtual) return;

    try {
      setProcessando(true);

      // Buscar nome do usuário atual se não estiver disponível
      let coletorNome = user?.user_metadata?.name || user?.user_metadata?.full_name;

      if (!coletorNome) {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('auth_id', user?.id)
          .single();
        coletorNome = userData?.name || 'Não identificado';
      }

      // 1. Atualizar obrigatoriamente fotos_coletadas para true e status para em_andamento
      const { error: atendimentoError } = await supabase
        .from('atendimentos')
        .update({
          fotos_coletadas: true,
          status: 'em_andamento'
        })
        .eq('id', chamadaAtual.atendimento_id);

      if (atendimentoError) {
        throw atendimentoError;
      }

      // 2. Tentar atualizar informações adicionais do coletor (caso os campos existam no banco)
      try {
        await supabase
          .from('atendimentos')
          .update({
            coletor_id: user?.id,
            coletor_nome: coletorNome
          })
          .eq('id', chamadaAtual.atendimento_id);
      } catch (colErr) {
        // Ignora caso as colunas de coletor não existam na tabela
      }

      // 3. Registrar histórico de coleta
      try {
        await registrarHistorico({
          atendimento_id: chamadaAtual.atendimento_id,
          acao: 'coleta_biometrica',
          atendente_id: user?.id,
          atendente_nome: coletorNome,
        });
      } catch (histErr) {
        console.error('Erro ao registrar histórico de coleta:', histErr);
      }

      // Fechar modal e recarregar
      setShowModal(false);
      setChamadaAtual(null);
      setObservacao('');
      await loadFila();
      await loadStats();

    } catch (error: any) {
      alert('Erro ao marcar como coletado: ' + (error.message || 'Tente novamente'));
    } finally {
      setProcessando(false);
    }
  };

  const marcarComoAusente = async () => {
    if (!chamadaAtual) return;

    try {
      setProcessando(true);

      // Marcar status como 'ausente' para não ficar retornando à fila de coleta
      const { error: atendimentoError } = await supabase
        .from('atendimentos')
        .update({
          status: 'ausente'
        })
        .eq('id', chamadaAtual.atendimento_id);

      if (atendimentoError) {
        throw atendimentoError;
      }

      setShowModal(false);
      setChamadaAtual(null);
      setObservacao('');
      await loadFila();
      await loadStats();

    } catch (error: any) {
      alert('Erro ao marcar como ausente: ' + (error.message || 'Tente novamente'));
    } finally {
      setProcessando(false);
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
                    <tr key={atendimento.id} className={`hover:bg-gray-50 ${atendimento.pessoa_incapaz ? 'bg-red-50/40' : atendimento.atendimento_preferencial ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-mono font-semibold text-gray-900">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{atendimento.nome}</span>
                          {atendimento.pessoa_incapaz && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 border border-red-300 uppercase">Incapaz</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 font-mono select-all cursor-text">
                          {atendimento.protocolo || '-'}
                        </div>
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

      {/* Modal de Chamada - Estado de Alerta */}
      {showModal && chamadaAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-[pulse_3s_ease-in-out_infinite] ring-4 ring-amber-400/60">

            {/* Banner de Alerta Superior */}
            <div className="bg-amber-500 px-6 py-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full animate-pulse">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white font-extrabold text-sm uppercase tracking-wider">⚠ Atenção — Pessoa Chamada</p>
                <p className="text-amber-100 text-xs font-medium">Confira os dados abaixo antes de prosseguir com a coleta</p>
              </div>
              <div className="flex items-center gap-2">
                {chamadaAtual.preferencial && (
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold border border-white/30 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    PREFERENCIAL
                  </span>
                )}
                <button
                  onClick={cancelarChamada}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Fechar (Volta para a fila)"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Banner Pessoa Incapaz */}
            {chamadaAtual.pessoa_incapaz && (
              <div className="bg-red-600 px-6 py-3 flex items-center gap-3 border-t border-red-700">
                <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full animate-pulse">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-extrabold text-sm uppercase tracking-wider">🚨 Pessoa Incapaz</p>
                  <p className="text-red-100 text-xs font-medium">Esta pessoa foi marcada como incapaz durante o atendimento</p>
                </div>
              </div>
            )}

            <div className="p-6">
              {/* Alerta de Conferência de Dados */}
              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 mb-5">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <div>
                    <p className="text-amber-800 font-bold text-sm">Confira os dados com o cliente!</p>
                    <ul className="mt-1.5 text-amber-700 text-xs space-y-1">
                      <li className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                        Verifique o <strong>nome completo</strong> do cliente
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                        Confirme o <strong>CPF</strong> com documento original
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                        Confira o <strong>protocolo</strong> antes de coletar as digitais
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Informações da Pessoa */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Nome Completo</p>
                    <p className="text-lg font-bold text-gray-900">{chamadaAtual.nome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">CPF</p>
                    <p className="text-lg font-bold font-mono text-gray-900 select-all cursor-text">{chamadaAtual.cpf}</p>
                  </div>
                </div>

                {/* Protocolo em destaque - selecione e copie manualmente */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Protocolo de Atendimento</p>
                      <p className="text-xl font-bold font-mono text-emerald-950 select-all cursor-text">{chamadaAtual.protocolo || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="mt-5 mb-5">
                <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-sm"
                  placeholder="Adicione observações sobre a coleta..."
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={cancelarChamada}
                  disabled={processando}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Voltar à Fila
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
        </div>
      )}
    </div>
  );
}
