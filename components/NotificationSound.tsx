"use client";

import { useEffect, useRef } from 'react';

interface NotificationSoundProps {
  play: boolean;
  type?: 'chamada' | 'success' | 'error';
}

export default function NotificationSound({ play, type = 'chamada' }: NotificationSoundProps) {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (play) {
      playNotificationSound(type);
    }
  }, [play, type]);

  const playNotificationSound = (soundType: string) => {
    try {
      // Criar contexto de áudio se não existir
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar frequências baseadas no tipo de som
      const frequencies = getFrequenciesForType(soundType);
      
      // Configurar volume
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

      // Tocar sequência de tons
      let currentTime = audioContext.currentTime;
      
      frequencies.forEach((freq, index) => {
        oscillator.frequency.setValueAtTime(freq, currentTime + (index * 0.2));
      });

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + frequencies.length * 0.2 + 0.5);

    } catch (error) {
      console.log('Erro ao reproduzir som:', error);
    }
  };

  const getFrequenciesForType = (soundType: string): number[] => {
    switch (soundType) {
      case 'chamada':
        return [800, 1000, 1200, 800]; // Sequência para chamada
      case 'success':
        return [523, 659, 784]; // C-E-G (acorde maior)
      case 'error':
        return [200, 150, 100]; // Tons graves
      default:
        return [800, 600, 800];
    }
  };

  return null; // Este componente não renderiza nada visual
}
