export const AUTH_CONFIG = {
    // Configurações de senha
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REQUIREMENTS: {
      UPPERCASE: true,
      LOWERCASE: true,
      NUMBERS: true,
      SPECIAL_CHARS: true,
    },

    // Configurações de Sessão
    SESSION_TIMEOUT: 2 * 60 * 60 * 1000, // 2 horas em milissegundos
    SESSION_WARNING_THRESHOLD: 10 * 60 * 1000, // 10 minutos em milissegundos
    
    // URLs de redirecionamento
    REDIRECT_URLS: {
      RESET_PASSWORD: '/auth/reset-password',
      EMAIL_CONFIRMATION: '/auth/callback',
      AGENDAMENTO: '/agendamento',
      DASHBOARD: '/dashboard',
      ATENDIMENTOS: '/dashboard/atendimentos'
    },
  
    // Mensagens de erro
    ERROR_MESSAGES: {
      INVALID_EMAIL: 'Por favor, insira um email válido',
      WEAK_PASSWORD: 'A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais',
      PASSWORDS_DONT_MATCH: 'As senhas não coincidem',
      EMAIL_IN_USE: 'Este email já está cadastrado',
      INVALID_CREDENTIALS: 'Email ou senha inválidos',
      GENERIC_ERROR: 'Ocorreu um erro. Por favor, tente novamente',
    },
  }; 
