import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

/**
 * Helper para verificar autenticação e permissões em rotas API
 * IMPORTANTE: Use apenas em rotas API do servidor
 */

export type UserRole = 'superadmin' | 'admin' | 'atendente' | 'user';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
}

interface AuthCheckResult {
  authenticated: boolean;
  authorized: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Verifica se o usuário está autenticado e tem a role necessária
 * @param request - NextRequest da rota API
 * @param requiredRole - Role mínima necessária (default: 'superadmin')
 * @returns Resultado da verificação com dados do usuário
 */
export async function checkAuth(
  request: NextRequest,
  requiredRole: UserRole = 'superadmin'
): Promise<AuthCheckResult> {
  try {
    // Pegar token do header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        authorized: false,
        error: 'Token de autenticação não fornecido'
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        authenticated: false,
        authorized: false,
        error: 'Configuração do servidor incompleta'
      };
    }

    // Criar cliente admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar token e pegar usuário do Auth
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      return {
        authenticated: false,
        authorized: false,
        error: 'Token inválido ou expirado'
      };
    }

    // Extrair dados do user_metadata
    const userData: AuthenticatedUser = {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
      role: authUser.user_metadata?.role || 'user',
      status: authUser.user_metadata?.status || 'active'
    };

    // Verificar se usuário está ativo
    if (userData.status !== 'active') {
      return {
        authenticated: true,
        authorized: false,
        error: 'Usuário inativo'
      };
    }

    // Verificar permissão baseada na role
    const hasPermission = checkRolePermission(userData.role, requiredRole);

    if (!hasPermission) {
      return {
        authenticated: true,
        authorized: false,
        error: `Permissão negada. Requer role: ${requiredRole}`
      };
    }

    return {
      authenticated: true,
      authorized: true,
      user: userData
    };

  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return {
      authenticated: false,
      authorized: false,
      error: 'Erro ao verificar autenticação'
    };
  }
}

/**
 * Verifica se a role do usuário tem permissão para a ação
 * Hierarquia: superadmin > admin > atendente > user
 */
function checkRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    superadmin: 4,
    admin: 3,
    atendente: 2,
    user: 1
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Helper para criar resposta de erro de autenticação
 */
export function unauthorizedResponse(message: string = 'Não autorizado') {
  return Response.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Helper para criar resposta de erro de permissão
 */
export function forbiddenResponse(message: string = 'Acesso negado') {
  return Response.json(
    { error: message },
    { status: 403 }
  );
}
