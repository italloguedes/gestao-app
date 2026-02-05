import { supabase } from './supabase-client';

export interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
  retryOnAuthFailure?: boolean;
}

class ApiClient {
  private isSessionValid(session: any): boolean {
    if (!session) return false;
    
    const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
    if (!expiresAt) return false;
    
    const now = Date.now();
    return expiresAt > now;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !this.isSessionValid(session)) {
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession();
        
        if (refreshError || !this.isSessionValid(refreshedSession)) {
          console.error('Falha ao obter token de autenticação');
          return null;
        }
        
        return refreshedSession!.access_token;
      }
      
      const expiresAt = session!.expires_at ? session!.expires_at * 1000 : null;
      const now = Date.now();
      const timeUntilExpiry = expiresAt ? expiresAt - now : null;

      if (timeUntilExpiry && timeUntilExpiry < 5 * 60 * 1000) {
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession();
        
        if (!refreshError && this.isSessionValid(refreshedSession)) {
          return refreshedSession!.access_token;
        }
      }
      
      return session!.access_token;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return null;
    }
  }

  async request<T = any>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<{ data: T | null; error: string | null; status: number }> {
    const {
      requiresAuth = true,
      retryOnAuthFailure = true,
      headers = {},
      ...fetchOptions
    } = options;

    const makeRequest = async (isRetry = false): Promise<{ data: T | null; error: string | null; status: number }> => {
      try {
        const requestHeaders: Record<string, string> = { ...headers as Record<string, string> };

        if (requiresAuth) {
          const token = await this.getAuthToken();
          
          if (!token) {
            return {
              data: null,
              error: 'Sessão expirada. Por favor, faça login novamente.',
              status: 401,
            };
          }

          requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        if (!requestHeaders['Content-Type'] && fetchOptions.method !== 'GET') {
          requestHeaders['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
          ...fetchOptions,
          headers: requestHeaders,
        });

        if (response.status === 401 && !isRetry && retryOnAuthFailure) {
          console.log('Token expirado, tentando renovar sessão...');
          
          const { data: { session }, error } = await supabase.auth.refreshSession();
          
          if (!error && session) {
            return makeRequest(true);
          }
        }

        let data: T | null = null;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        }

        if (!response.ok) {
          const errorMessage = (data as any)?.error || 
                             (data as any)?.message || 
                             `Erro na requisição: ${response.status}`;
          
          return {
            data: null,
            error: errorMessage,
            status: response.status,
          };
        }

        return {
          data,
          error: null,
          status: response.status,
        };
      } catch (error) {
        console.error('Erro na requisição:', error);
        return {
          data: null,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          status: 500,
        };
      }
    };

    return makeRequest();
  }

  async get<T = any>(url: string, options?: ApiRequestOptions) {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  async post<T = any>(url: string, body?: any, options?: ApiRequestOptions) {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(url: string, body?: any, options?: ApiRequestOptions) {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(url: string, options?: ApiRequestOptions) {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  async patch<T = any>(url: string, body?: any, options?: ApiRequestOptions) {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
