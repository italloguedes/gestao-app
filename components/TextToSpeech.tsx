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
    if (!isSupported) {
      return;
    }
    
    if (!text) {
      return;
    }

    // Parar qualquer fala anterior
    speechSynthesis.cancel();

    // Criar novo utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Configurar voz usando a função otimizada
    const bestVoice = getBestPortugueseVoice();
    
    if (bestVoice) {
      utterance.voice = bestVoice;
    } else if (voices.length > 0) {
      // Fallback para voz especificada ou primeira disponível
      const selectedVoice = voices.find(v => v.name === voice) || voices[0];
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Configurar parâmetros
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Eventos
    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      onComplete?.();
    };

    utterance.onerror = (event) => {
      setIsPlaying(false);
      onComplete?.();
    };

    // Falar
    speechSynthesis.speak(utterance);
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
