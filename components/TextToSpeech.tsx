"use client";

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_VOICE_CONFIG, getBestPortugueseVoice, isVoiceSupported } from '@/lib/voiceConfig';

interface TextToSpeechProps {
  text: string;
  play: boolean;
  onComplete?: () => void;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export default function TextToSpeech({ 
  text, 
  play, 
  onComplete,
  voice,
  rate = 0.9,
  pitch = 1,
  volume = 1
}: TextToSpeechProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Verificar se o navegador suporta síntese de voz
    if (isVoiceSupported()) {
      setIsSupported(true);
      
      // Carregar vozes disponíveis
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      
      // Alguns navegadores carregam as vozes de forma assíncrona
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  useEffect(() => {
    if (play && text && isSupported) {
      speakText();
    }
  }, [play, text, isSupported]);

  const speakText = () => {
    console.log('🔊 TextToSpeech: Iniciando fala...', { isSupported, text, play });
    
    if (!isSupported) {
      console.error('❌ Síntese de voz não suportada neste navegador');
      return;
    }
    
    if (!text) {
      console.error('❌ Texto vazio para falar');
      return;
    }

    // Aguardar um pouco para garantir que as vozes estejam carregadas
    setTimeout(() => {
      // Parar qualquer fala anterior
      speechSynthesis.cancel();

      // Aguardar um pouco após cancelar
      setTimeout(() => {
        // Criar novo utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        
        console.log('🔊 TextToSpeech: Utterance criado', utterance);

        // Configurar voz usando a função otimizada
        const bestVoice = getBestPortugueseVoice();
        console.log('🔊 TextToSpeech: Vozes disponíveis', voices.length);
        console.log('🔊 TextToSpeech: Melhor voz em português', bestVoice);
        
        if (bestVoice) {
          utterance.voice = bestVoice;
          utterance.lang = 'pt-BR';
          console.log('🔊 TextToSpeech: Usando voz em português:', bestVoice.name);
        } else if (voices.length > 0) {
          // Fallback para voz especificada ou primeira disponível
          const selectedVoice = voices.find(v => v.name === voice) || voices[0];
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
            console.log('🔊 TextToSpeech: Usando voz fallback:', selectedVoice.name);
          }
        } else {
          utterance.lang = 'pt-BR';
          console.log('🔊 TextToSpeech: Usando voz padrão do sistema');
        }

        // Configurar parâmetros otimizados para clareza
        utterance.rate = Math.max(0.5, Math.min(1.2, rate)); // Limitar entre 0.5 e 1.2
        utterance.pitch = Math.max(0.8, Math.min(1.5, pitch)); // Limitar entre 0.8 e 1.5
        utterance.volume = Math.max(0.3, Math.min(1.0, volume)); // Limitar entre 0.3 e 1.0
        
        console.log('🔊 TextToSpeech: Configurações aplicadas', { 
          rate: utterance.rate, 
          pitch: utterance.pitch, 
          volume: utterance.volume,
          lang: utterance.lang
        });

        // Eventos
        utterance.onstart = () => {
          console.log('🔊 TextToSpeech: Fala iniciada');
          setIsPlaying(true);
        };

        utterance.onend = () => {
          console.log('🔊 TextToSpeech: Fala finalizada');
          setIsPlaying(false);
          onComplete?.();
        };

        utterance.onerror = (event) => {
          console.error('❌ TextToSpeech: Erro na síntese de voz:', event.error);
          setIsPlaying(false);
          onComplete?.();
        };

        // Falar
        console.log('🔊 TextToSpeech: Iniciando speechSynthesis.speak()');
        try {
          speechSynthesis.speak(utterance);
        } catch (error) {
          console.error('❌ TextToSpeech: Erro ao executar speak():', error);
          setIsPlaying(false);
          onComplete?.();
        }
      }, 100);
    }, 200);
  };

  const stopSpeaking = () => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (isSupported) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-500">
        Síntese de voz não suportada neste navegador
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {isPlaying && (
        <div className="flex items-center text-green-600">
          <div className="animate-pulse">🔊</div>
          <span className="ml-1 text-sm">Falando...</span>
        </div>
      )}
      
      {voices.length > 0 && (
        <div className="text-xs text-gray-500">
          Voz: {voices.find(v => v.lang.includes('pt'))?.name || 'Padrão'}
        </div>
      )}
    </div>
  );
}

// Hook para usar síntese de voz
export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = (text: string, options?: {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Síntese de voz não suportada');
      return;
    }

    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (options?.voice) {
      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === options.voice);
      if (selectedVoice) utterance.voice = selectedVoice;
    }
    
    utterance.rate = options?.rate || 0.9;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 1;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    speechSynthesis.speak(utterance);
  };

  const stop = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  };

  return { speak, stop, isPlaying };
};
