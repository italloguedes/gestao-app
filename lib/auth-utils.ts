import { AUTH_CONFIG } from './auth-config';

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      message: AUTH_CONFIG.ERROR_MESSAGES.WEAK_PASSWORD,
    };
  }

  if (AUTH_CONFIG.PASSWORD_REQUIREMENTS.UPPERCASE && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: AUTH_CONFIG.ERROR_MESSAGES.WEAK_PASSWORD,
    };
  }

  if (AUTH_CONFIG.PASSWORD_REQUIREMENTS.LOWERCASE && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: AUTH_CONFIG.ERROR_MESSAGES.WEAK_PASSWORD,
    };
  }

  if (AUTH_CONFIG.PASSWORD_REQUIREMENTS.NUMBERS && !/\d/.test(password)) {
    return {
      isValid: false,
      message: AUTH_CONFIG.ERROR_MESSAGES.WEAK_PASSWORD,
    };
  }

  if (AUTH_CONFIG.PASSWORD_REQUIREMENTS.SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      message: AUTH_CONFIG.ERROR_MESSAGES.WEAK_PASSWORD,
    };
  }

  return { isValid: true };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const handleAuthError = (error: any): string => {
  if (error.message.includes('already registered')) {
    return AUTH_CONFIG.ERROR_MESSAGES.EMAIL_IN_USE;
  }
  if (error.message.includes('Invalid login credentials')) {
    return AUTH_CONFIG.ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  return AUTH_CONFIG.ERROR_MESSAGES.GENERIC_ERROR;
}; 
