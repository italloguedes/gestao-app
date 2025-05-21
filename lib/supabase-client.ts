import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não está definido');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY não está definido');
}

// Verifica se estamos no navegador
const isBrowser = typeof window !== 'undefined';

// Função para manipular o storage com segurança
const customStorage = {
  getItem: (key: string) => {
    if (!isBrowser) return null;
    const value = localStorage.getItem(key);
    if (value) {
      try {
        const session = JSON.parse(value);
        // Se a sessão expirou (2 horas), remove ela
        if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
          localStorage.removeItem(key);
          return null;
        }
      } catch (error) {
        console.error('Erro ao processar sessão:', error);
        return null;
      }
    }
    return value;
  },
  setItem: (key: string, value: string) => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  },
  removeItem: (key: string) => {
    if (!isBrowser) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Erro ao remover do localStorage:', error);
    }
  }
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'app-session',
      storage: customStorage
    },
    db: {
      schema: 'public'
    }
  }
);

// Função para verificar se o Supabase está inicializado corretamente
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o Supabase:', error);
    return false;
  }
};

// Função para tratar erros do Supabase
export const handleSupabaseError = (error: any) => {
  console.error('Erro Supabase:', error);

  // Mapeamento de códigos de erro comuns
  const errorMessages: { [key: string]: string } = {
    'PGRST301': 'Erro de conexão com o banco de dados',
    'PGRST302': 'Erro de autenticação',
    'PGRST303': 'Erro de autorização',
    'PGRST304': 'Erro de validação',
    'PGRST305': 'Erro de timeout',
    'PGRST306': 'Erro de conflito',
    'PGRST307': 'Erro de recurso não encontrado',
    'PGRST308': 'Erro de método não permitido',
    'PGRST309': 'Erro de requisição inválida',
  };

  // Verifica se é um erro conhecido
  if (error.code && errorMessages[error.code]) {
    return errorMessages[error.code];
  }

  // Verifica mensagens de erro específicas
  if (error.message) {
    if (error.message.includes('network')) {
      return 'Erro de conexão. Verifique sua internet.';
    }
    if (error.message.includes('timeout')) {
      return 'Tempo de conexão esgotado. Tente novamente.';
    }
    if (error.message.includes('auth')) {
      return 'Erro de autenticação. Verifique suas credenciais.';
    }
  }

  return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
}; 
