"use client";

import { useEffect, useRef } from 'react';

interface NotificationSoundProps {
  play: boolean;
  type?: 'chamada' | 'success' | 'error';
}

export default function NotificationSound({ play, type = 'chamada' }: NotificationSoundProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (play && !isPlayingRef.current) {
      console.log('🔊 NotificationSound: Iniciando reprodução de som', { type, play });
      playNotificationSound(type);
    }
  }, [play, type]);

  const playNotificationSound = async (soundType: string) => {
    try {
      console.log('🔊 NotificationSound: Tentando reproduzir som', { soundType });
      
      // Verificar se já está tocando
      if (isPlayingRef.current) {
        console.log('🔊 NotificationSound: Som já está tocando, ignorando');
        return;
      }

      isPlayingRef.current = true;

      // Criar contexto de áudio se não existir
      if (!audioContextRef.current) {
        console.log('🔊 NotificationSound: Criando novo AudioContext');
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Verificar se o contexto está suspenso (requer interação do usuário)
      if (audioContext.state === 'suspended') {
        console.log('🔊 NotificationSound: Contexto suspenso, tentando retomar');
        await audioContext.resume();
      }

      console.log('🔊 NotificationSound: Contexto de áudio pronto', { state: audioContext.state });

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar frequências baseadas no tipo de som
      const frequencies = getFrequenciesForType(soundType);
      console.log('🔊 NotificationSound: Frequências configuradas', { frequencies });
      
      // Configurar volume mais alto e chamativo
      gainNode.gain.setValueAtTime(0.9, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);

      // Configurar tipo de onda para som mais chamativo
      oscillator.type = 'square';

      // Tocar sequência de tons mais rápida e chamativa
      let currentTime = audioContext.currentTime;
      
      frequencies.forEach((freq, index) => {
        oscillator.frequency.setValueAtTime(freq, currentTime + (index * 0.1));
      });

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + frequencies.length * 0.1 + 2);

      console.log('🔊 NotificationSound: Som iniciado com sucesso');

      // Resetar flag após o som terminar
      setTimeout(() => {
        isPlayingRef.current = false;
        console.log('🔊 NotificationSound: Som finalizado');
      }, (frequencies.length * 0.1 + 2) * 1000);

    } catch (error) {
      console.error('❌ NotificationSound: Erro ao reproduzir som:', error);
      isPlayingRef.current = false;
    }
  };

  const getFrequenciesForType = (soundType: string): number[] => {
    switch (soundType) {
      case 'chamada':
        return [800, 1000, 1200, 1400, 800, 1000, 1200, 1400, 800, 1000, 1200, 1400]; // Sequência muito chamativa e repetitiva
      case 'success':
        return [523, 659, 784]; // C-E-G (acorde maior)
      case 'error':
        return [200, 150, 100]; // Tons graves
      default:
        return [800, 1000, 1200, 1400, 800, 1000, 1200, 1400]; // Sequência padrão chamativa
    }
  };

  return null; // Este componente não renderiza nada visual
}
