"use client";

import React, { useEffect, useState } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import NotificationSound from '@/components/NotificationSound';
import ChamadaNotification from '@/components/ChamadaNotification';

interface ChamadaSenha {
  id: number;
  agendamento_id: number;
  nome: string;
  horario: string;
  status: 'chamada' | 'atendido' | 'ausente';
  data_chamada: string;
  atendente_id?: string;
  observacoes?: string;
  created_at: string;
  agendamentos?: {
    atendimento_preferencial?: boolean;
  };
}

export default function ChamadaSenhasPage() {
  const [chamadas, setChamadas] = useState<ChamadaSenha[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [playSound, setPlaySound] = useState(false);
  const [previousChamadasCount, setPreviousChamadasCount] = useState(0);
  const [showChamadaNotification, setShowChamadaNotification] = useState(false);
  const [chamadaData, setChamadaData] = useState<{nome: string, horario: string, preferencial: boolean, timeLeft?: number} | null>(null);
  const [lastChamadaId, setLastChamadaId] = useState<number | null>(null);
  const [lastChamadaTimestamp, setLastChamadaTimestamp] = useState<string | null>(null);
  const [notificationTimer, setNotificationTimer] = useState<NodeJS.Timeout | null>(null);

  // Atualizar horário a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Buscar chamadas ativas
  const fetchChamadas = async () => {
    try {
      setError(null);
      const response = await fetch('/api/chamada-senhas?status=chamada');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          console.log('📡 Chamadas recebidas:', data.length, 'chamadas');
          if (data.length > 0) {
            console.log('📡 Primeira chamada:', data[0]);
          }
          setChamadas(data);
        } else {
          console.warn('Dados recebidos não são um array:', data);
          setChamadas([]);
        }
      } else {
        console.error('Erro na resposta da API:', response.status);
        setError('Erro ao carregar chamadas');
        setChamadas([]);
      }
    } catch (error) {
      console.error('Erro ao buscar chamadas:', error);
      setError('Erro de conexão');
      setChamadas([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar chamadas imediatamente e depois a cada 500ms para tempo real
  useEffect(() => {
    fetchChamadas();
    const interval = setInterval(fetchChamadas, 500);
    return () => clearInterval(interval);
  }, []);

  // Cleanup do timer quando componente for desmontado
  useEffect(() => {
    return () => {
      if (notificationTimer) {
        clearTimeout(notificationTimer);
      }
    };
  }, [notificationTimer]);

  // Detectar novas chamadas e tocar som
  useEffect(() => {
    if (chamadas.length > 0) {
      const ultimaChamada = chamadas[0];
      
      // Verificar se é uma nova chamada baseada no ID e timestamp
      if (ultimaChamada && ultimaChamada.id) {
        const isNewId = lastChamadaId === null || ultimaChamada.id !== lastChamadaId;
        const isNewTimestamp = lastChamadaTimestamp === null || ultimaChamada.created_at !== lastChamadaTimestamp;
        
        if (isNewId || isNewTimestamp) {
          console.log('🔊 NOVA CHAMADA DETECTADA!', {
            id: ultimaChamada.id,
            nome: ultimaChamada.nome,
            horario: ultimaChamada.horario,
            created_at: ultimaChamada.created_at,
            lastId: lastChamadaId,
            lastTimestamp: lastChamadaTimestamp,
            isFirstLoad: lastChamadaId === null
          });
          
          // Só mostrar notificação se não for o primeiro carregamento
          if (lastChamadaId !== null) {
            console.log('🔔 MOSTRANDO NOTIFICAÇÃO!');
            
            // Reset da notificação anterior se estiver ativa
            if (showChamadaNotification) {
              console.log('🔄 Resetando notificação anterior...');
              setShowChamadaNotification(false);
              setChamadaData(null);
            }
            
            // Pequeno delay para garantir que o reset aconteça
            setTimeout(() => {
              // Mostrar notificação com auto-close
              showNotificationWithTimer({
                nome: ultimaChamada.nome,
                horario: ultimaChamada.horario ? ultimaChamada.horario.substring(0, 5) : '00:00',
                preferencial: ultimaChamada.agendamentos?.atendimento_preferencial || false
              });
            }, 100);
          }
          
          // Atualizar o ID e timestamp da última chamada
          setLastChamadaId(ultimaChamada.id);
          setLastChamadaTimestamp(ultimaChamada.created_at);
        }
      }
    }
  }, [chamadas, lastChamadaId, lastChamadaTimestamp]);

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  // Função para mostrar notificação com auto-close
  const showNotificationWithTimer = (data: {nome: string, horario: string, preferencial: boolean}) => {
    // Limpar timer anterior se existir
    if (notificationTimer) {
      clearTimeout(notificationTimer);
    }

    // Mostrar notificação com contador inicial
    setChamadaData({...data, timeLeft: 8});
    setShowChamadaNotification(true);
    
    // Tocar som
    setPlaySound(true);
    setTimeout(() => setPlaySound(false), 100);

    // Atualizar contador a cada segundo
    let timeLeft = 8;
    const countdownInterval = setInterval(() => {
      timeLeft--;
      setChamadaData(prev => prev ? {...prev, timeLeft} : null);
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    // Configurar auto-close após 8 segundos
    const timer = setTimeout(() => {
      console.log('⏰ Auto-fechando notificação após 8 segundos...');
      clearInterval(countdownInterval);
      setShowChamadaNotification(false);
      setTimeout(() => {
        setChamadaData(null);
      }, 300); // Aguarda animação de fechamento
    }, 8000);

    setNotificationTimer(timer);
  };

  // Função para testar notificação
  const testNotification = () => {
    console.log('🧪 Testando notificação...');
    
    // Reset da notificação anterior se estiver ativa
    if (showChamadaNotification) {
      console.log('🔄 Resetando notificação anterior...');
      setShowChamadaNotification(false);
      setChamadaData(null);
    }
    
    // Pequeno delay para garantir que o reset aconteça
    setTimeout(() => {
      showNotificationWithTimer({
        nome: `TESTE ${Date.now()}`,
        horario: '12:00',
        preferencial: false
      });
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Carregando chamadas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">Erro ao Carregar</h1>
          <p className="text-lg mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchChamadas();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
        <NotificationSound play={playSound} type="chamada" />
        
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Sistema de Chamadas
                </h1>
                <p className="text-blue-200 text-lg">
                  Sala Sensorial - ALECE
                </p>
                <p className="text-blue-300 text-sm mt-1">
                  Exibindo as últimas 6 chamadas
                </p>
              </div>
              <div className="text-right text-white">
                <div className="text-2xl font-mono font-bold">
                  {currentTime.toLocaleTimeString('pt-BR')}
                </div>
                <div className="text-blue-200">
                  {currentTime.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={testNotification}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  >
                    🧪 Testar Notificação
                  </button>
                  <button
                    onClick={() => {
                      // Testar múltiplas notificações
                      for (let i = 1; i <= 3; i++) {
                        setTimeout(() => {
                          testNotification();
                        }, i * 2000);
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    🔄 Testar Sequência
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {!chamadas || chamadas.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 border border-white/20">
                <div className="text-6xl mb-6">🔔</div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Aguardando Chamadas
                </h2>
                <p className="text-blue-200 text-xl">
                  As chamadas aparecerão aqui quando os atendentes as iniciarem
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Últimas 6 Chamadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(chamadas || []).slice(0, 6).map((chamada, index) => {
                  // Validação robusta dos dados da chamada
                  if (!chamada || typeof chamada !== 'object') {
                    console.warn('Chamada inválida encontrada:', chamada);
                    return null;
                  }
                  
                  return (
                    <div
                      key={chamada.id}
                      className={`rounded-2xl p-4 border-4 shadow-2xl transition-all duration-300 ${
                        index === 0
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400 animate-pulse'
                          : index === 1
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-600 border-blue-400'
                          : index === 2
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 border-purple-400'
                          : index === 3
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 border-orange-400'
                          : index === 4
                          ? 'bg-gradient-to-r from-pink-500 to-rose-600 border-pink-400'
                          : 'bg-gradient-to-r from-teal-500 to-cyan-600 border-teal-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {index === 0 ? '📢' : index === 1 ? '🔔' : index === 2 ? '📣' : index === 3 ? '📢' : index === 4 ? '🔔' : '📣'}
                        </div>
                        <h3 className={`text-lg font-bold text-white mb-2 ${
                          index === 0 ? 'text-xl' : 'text-base'
                        }`}>
                          {index === 0 ? 'CHAMADA ATUAL' : `CHAMADA ${index + 1}`}
                        </h3>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mb-2">
                          <div className={`font-bold text-white mb-1 ${
                            index === 0 ? 'text-xl' : 'text-lg'
                          }`}>
                            {chamada.nome || 'Nome não disponível'}
                          </div>
                          <div className={`text-green-100 ${
                            index === 0 ? 'text-sm' : 'text-xs'
                          }`}>
                            {chamada.horario ? formatTime(chamada.horario) : 'Horário não disponível'}
                          </div>
                          {chamada.agendamentos?.atendimento_preferencial && (
                            <div className="mt-2 inline-block bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full font-bold text-xs">
                              ⭐ PREFERENCIAL
                            </div>
                          )}
                        </div>
                        <div className={`text-green-100 ${
                          index === 0 ? 'text-sm' : 'text-xs'
                        }`}>
                          {index === 0 ? 'Dirija-se ao atendimento' : 'Aguarde sua vez'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mensagem se não há chamadas suficientes */}
              {chamadas.length < 6 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                  <div className="text-4xl mb-4">⏳</div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Aguardando Mais Chamadas
                  </h3>
                  <p className="text-blue-200">
                    {chamadas.length === 0 
                      ? 'Nenhuma chamada ainda hoje'
                      : `${chamadas.length} de 6 chamadas exibidas`
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instruções */}
          <div className="mt-12">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
                <h3 className="text-xl font-bold text-white mb-4">
                  Instruções
                </h3>
                <div className="text-blue-200 space-y-2">
                  <p>• Aguarde sua chamada aparecer na tela</p>
                  <p>• Dirija-se ao atendimento quando seu nome for chamado</p>
                  <p>• Em caso de dúvidas, procure um atendente</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="text-center text-blue-200">
              <p>Sistema de Chamadas - Sala Sensorial ALECE</p>
              <p className="text-sm mt-1">
                Atualizado automaticamente a cada 500ms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notificação de Chamada */}
      {chamadaData && (
        <ChamadaNotification
          isVisible={showChamadaNotification}
          nome={chamadaData.nome}
          horario={chamadaData.horario}
          preferencial={chamadaData.preferencial}
          timeLeft={chamadaData.timeLeft}
          onClose={() => {
            setShowChamadaNotification(false);
            setChamadaData(null);
          }}
        />
      )}
    </ErrorBoundary>
  );
}