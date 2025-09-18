// Configurações de voz para o sistema de chamadas

export interface VoiceConfig {
  rate: number;        // Velocidade da fala (0.1 - 10)
  pitch: number;       // Tom da voz (0 - 2)
  volume: number;      // Volume (0 - 1)
  language: string;    // Idioma preferido
  voiceName?: string;  // Nome específico da voz
}

// Configurações padrão para chamadas
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  rate: 0.7,           // Velocidade mais lenta para melhor clareza
  pitch: 1.0,          // Tom neutro para clareza
  volume: 1.0,         // Volume máximo para audibilidade
  language: 'pt-BR',   // Português brasileiro
};

// Configurações para diferentes tipos de mensagens
export const VOICE_CONFIGS = {
  // Para chamadas de senhas
  chamada: {
    rate: 0.7,
    pitch: 1.0,
    volume: 1.0,
    language: 'pt-BR',
  },
  
  // Para notificações gerais
  notificacao: {
    rate: 0.8,
    pitch: 1.0,
    volume: 0.8,
    language: 'pt-BR',
  },
  
  // Para mensagens de erro
  erro: {
    rate: 0.6,
    pitch: 0.9,
    volume: 0.9,
    language: 'pt-BR',
  },
  
  // Para mensagens de sucesso
  sucesso: {
    rate: 0.8,
    pitch: 1.1,
    volume: 0.9,
    language: 'pt-BR',
  }
} as const;

// Textos padrão para diferentes situações
export const VOICE_MESSAGES = {
  chamada: (nome: string) => `Atenção! Chamada para ${nome}. Dirija-se ao atendimento, por favor.`,
  chamadaPreferencial: (nome: string) => `Atenção! Chamada preferencial para ${nome}. Dirija-se ao atendimento, por favor.`,
  teste: "Teste de voz. Sistema funcionando corretamente.",
  proxima: (nome: string) => `Próxima chamada será para ${nome}.`,
  aguarde: "Aguarde sua chamada. Obrigado pela paciência.",
  sistemaAtivo: "Sistema de chamadas ativo. Aguarde sua vez.",
} as const;

// Função para obter configuração de voz baseada no tipo
export function getVoiceConfig(type: keyof typeof VOICE_CONFIGS): VoiceConfig {
  return VOICE_CONFIGS[type];
}

// Função para obter mensagem de voz baseada no tipo
export function getVoiceMessage(type: keyof typeof VOICE_MESSAGES, ...args: any[]): string {
  const messageFunction = VOICE_MESSAGES[type];
  if (typeof messageFunction === 'function') {
    return messageFunction(...args);
  }
  return messageFunction;
}

// Função para detectar se o navegador suporta síntese de voz
export function isVoiceSupported(): boolean {
  return 'speechSynthesis' in window;
}

// Função para obter vozes disponíveis em português
export function getPortugueseVoices(): SpeechSynthesisVoice[] {
  if (!isVoiceSupported()) return [];
  
  return speechSynthesis.getVoices().filter(voice => 
    voice.lang.includes('pt') || voice.lang.includes('PT')
  );
}

// Função para obter a melhor voz em português
export function getBestPortugueseVoice(): SpeechSynthesisVoice | null {
  const voices = getPortugueseVoices();
  
  if (voices.length === 0) return null;
  
  // Priorizar vozes brasileiras
  const brazilianVoice = voices.find(voice => voice.lang.includes('pt-BR'));
  if (brazilianVoice) return brazilianVoice;
  
  // Se não encontrar brasileira, usar a primeira em português
  return voices[0];
}

// Função para testar se a voz está funcionando
export function testVoice(config: VoiceConfig = DEFAULT_VOICE_CONFIG): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isVoiceSupported()) {
      resolve(false);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance("Teste de voz");
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;
    utterance.lang = config.language;
    
    const voice = getBestPortugueseVoice();
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    
    speechSynthesis.speak(utterance);
  });
}
