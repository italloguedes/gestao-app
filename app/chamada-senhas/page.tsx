"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NotificationSound from '@/components/NotificationSound';
import TextToSpeech from '@/components/TextToSpeech';
import { getVoiceMessage, getVoiceConfig } from '@/lib/voiceConfig';

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
  const router = useRouter();
  const [chamadas, setChamadas] = useState<ChamadaSenha[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [playSound, setPlaySound] = useState(false);
  const [previousChamadasCount, setPreviousChamadasCount] = useState(0);
  const [speakText, setSpeakText] = useState('');
  const [shouldSpeak, setShouldSpeak] = useState(false);

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
      const response = await fetch('/api/chamada-senhas?status=chamada');
      if (response.ok) {
        const data = await response.json();
        setChamadas(data);
      }
    } catch (error) {
      console.error('Erro ao buscar chamadas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar chamadas a cada 5 segundos
  useEffect(() => {
    fetchChamadas();
    const interval = setInterval(fetchChamadas, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reproduzir som e falar nome quando nova chamada for adicionada
  useEffect(() => {
    console.log('🔊 Debug: Verificando chamadas', { 
      chamadasLength: chamadas.length, 
      previousCount: previousChamadasCount 
    });
    
    if (chamadas.length > previousChamadasCount && chamadas.length > 0) {
      const novaChamada = chamadas[0]; // A primeira é sempre a mais recente
      console.log('🔊 Debug: Nova chamada detectada', novaChamada);
      
      if (novaChamada) {
        // Tocar som de notificação
        setPlaySound(true);
        
        // Falar o nome da pessoa usando configurações otimizadas
        const textoFala = novaChamada.agendamentos?.atendimento_preferencial 
          ? getVoiceMessage('chamadaPreferencial', novaChamada.nome)
          : getVoiceMessage('chamada', novaChamada.nome);
        
        console.log('🔊 Debug: Texto para falar', textoFala);
        setSpeakText(textoFala);
        setShouldSpeak(true);
        
        setPreviousChamadasCount(chamadas.length);
      }
    }
  }, [chamadas.length, previousChamadasCount]);

  const handleSoundPlayed = () => {
    setPlaySound(false);
  };

  const handleSpeechComplete = () => {
    setShouldSpeak(false);
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + "T12:00:00Z");
      return date.toLocaleDateString("pt-BR", {
        timeZone: "America/Fortaleza",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return dateString;
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <NotificationSound play={playSound} type="chamada" />
      <TextToSpeech 
        text={speakText} 
        play={shouldSpeak} 
        onComplete={handleSpeechComplete}
        {...getVoiceConfig('chamada')}
      />
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
                Exibindo as últimas 4 chamadas
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
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {chamadas.length === 0 ? (
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
            {/* Últimas 4 Chamadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {chamadas.slice(0, 4).map((chamada, index) => (
                <div
                  key={chamada.id}
                  className={`rounded-2xl p-6 border-4 shadow-2xl transition-all duration-300 ${
                    index === 0
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400 animate-pulse'
                      : index === 1
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-600 border-blue-400'
                      : index === 2
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 border-purple-400'
                      : 'bg-gradient-to-r from-orange-500 to-red-600 border-orange-400'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">
                      {index === 0 ? '📢' : index === 1 ? '🔔' : index === 2 ? '📣' : '📢'}
                    </div>
                    <h3 className={`text-2xl font-bold text-white mb-2 ${
                      index === 0 ? 'text-3xl' : 'text-xl'
                    }`}>
                      {index === 0 ? 'CHAMADA ATUAL' : `CHAMADA ${index + 1}`}
                    </h3>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-3">
                      <div className={`font-bold text-white mb-2 ${
                        index === 0 ? 'text-3xl' : 'text-xl'
                      }`}>
                        {chamada.nome}
                      </div>
                      <div className={`text-green-100 ${
                        index === 0 ? 'text-lg' : 'text-sm'
                      }`}>
                        Horário: {formatTime(chamada.horario)}
                      </div>
                      {chamada.agendamentos?.atendimento_preferencial && (
                        <div className="mt-3 inline-block bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full font-bold text-sm">
                          ⭐ ATENDIMENTO PREFERENCIAL
                        </div>
                      )}
                    </div>
                    <div className={`text-green-100 ${
                      index === 0 ? 'text-lg' : 'text-sm'
                    }`}>
                      {index === 0 ? 'Dirija-se ao atendimento' : 'Aguarde sua vez'}
                    </div>
                    
                    {/* Indicador de voz apenas para a primeira chamada */}
                    {index === 0 && shouldSpeak && (
                      <div className="bg-white/30 backdrop-blur-sm rounded-lg p-3 mt-3">
                        <div className="flex items-center justify-center text-white">
                          <div className="animate-pulse mr-2">🔊</div>
                          <span className="text-sm font-semibold">Falando: "{speakText}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mensagem se não há chamadas suficientes */}
            {chamadas.length < 4 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                <div className="text-4xl mb-4">⏳</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Aguardando Mais Chamadas
                </h3>
                <p className="text-blue-200">
                  {chamadas.length === 0 
                    ? 'Nenhuma chamada ainda hoje'
                    : `Apenas ${chamadas.length} chamada${chamadas.length > 1 ? 's' : ''} até agora`
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instruções e Teste */}
        <div className="mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Instruções */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">
                Instruções
              </h3>
              <div className="text-blue-200 space-y-2">
                <p>• Aguarde sua chamada aparecer na tela</p>
                <p>• Dirija-se ao atendimento quando seu nome for chamado</p>
                <p>• O sistema falará seu nome automaticamente</p>
                <p>• Em caso de dúvidas, procure um atendente</p>
              </div>
            </div>
            
            {/* Teste de Voz */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">
                Teste de Voz
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    console.log('🔊 Teste: Iniciando teste de voz');
                    const textoTeste = getVoiceMessage('teste');
                    setSpeakText(textoTeste);
                    setShouldSpeak(true);
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Testar Voz
                </button>
                
                <button
                  onClick={() => {
                    console.log('🔊 Teste: Verificando suporte');
                    const supported = 'speechSynthesis' in window;
                    const voices = supported ? speechSynthesis.getVoices() : [];
                    console.log('Suporte:', supported);
                    console.log('Vozes disponíveis:', voices.length);
                    console.log('Vozes:', voices.map(v => ({ name: v.name, lang: v.lang })));
                    alert(`Suporte: ${supported}\nVozes: ${voices.length}\nVerifique o console para detalhes`);
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verificar Suporte
                </button>
                
                <div className="text-blue-200 text-sm">
                  <p>Status: {shouldSpeak ? '🔊 Falando...' : '⏸️ Aguardando'}</p>
                  <p className="text-xs mt-1">Abra o console (F12) para ver logs</p>
                </div>
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
              Atualizado automaticamente a cada 5 segundos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
