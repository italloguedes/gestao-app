/**
 * Sistema de Permissões Profissional
 * Define roles, permissões e verificações de acesso
 */

export type UserRole = 'superadmin' | 'admin' | 'atendente' | 'user';

export interface PermissionConfig {
  role: UserRole;
  displayName: string;
  permissions: Permission[];
  routes: string[];
}

export type Permission =
  | 'manage_users'      // Gerenciar usuários (criar, editar, deletar)
  | 'view_dashboard'    // Visualizar dashboard
  | 'manage_atendimentos' // Gerenciar atendimentos
  | 'view_relatorios'   // Visualizar relatórios
  | 'manage_agendamentos' // Gerenciar agendamentos
  | 'view_estatisticas' // Ver estatísticas
  | 'manage_system'     // Configurações do sistema
  | 'public_access';    // Acesso público

/**
 * Configuração de permissões por role
 */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionConfig> = {
  superadmin: {
    role: 'superadmin',
    displayName: 'Super Administrador',
    permissions: [
      'manage_users',
      'view_dashboard',
      'manage_atendimentos',
      'view_relatorios',
      'manage_agendamentos',
      'view_estatisticas',
      'manage_system',
    ],
    routes: ['/dashboard', '/admin', '/dashboard/relatorios', '/agendamento'],
  },
  admin: {
    role: 'admin',
    displayName: 'Administrador',
    permissions: [
      'view_dashboard',
      'manage_atendimentos',
      'view_relatorios',
      'manage_agendamentos',
      'view_estatisticas',
    ],
    routes: ['/dashboard', '/dashboard/relatorios', '/admin/agendamentos', '/agendamento'],
  },
  atendente: {
    role: 'atendente',
    displayName: 'Atendente',
    permissions: [
      'view_dashboard',
      'manage_atendimentos',
      'view_relatorios',
      'view_estatisticas',
    ],
    routes: ['/dashboard', '/dashboard/atendimentos', '/dashboard/relatorios', '/agendamento'],
  },
  user: {
    role: 'user',
    displayName: 'Usuário',
    permissions: ['public_access'],
    routes: ['/agendamento'],
  },
};

/**
 * Rotas públicas que não requerem autenticação
 */
export const PUBLIC_ROUTES = [
  '/',
  '/agendamento',
  '/consulta',
  '/auth/callback',
  '/auth/reset-password',
];

/**
 * Rotas que requerem apenas autenticação (sem verificação de role)
 */
export const AUTHENTICATED_ROUTES = [
  '/agendamento',
  '/consulta',
];

/**
 * Verifica se o usuário tem uma permissão específica
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const config = ROLE_PERMISSIONS[role];
  return config?.permissions.includes(permission) ?? false;
}

/**
 * Verifica se o usuário tem acesso a uma rota
 */
export function hasRouteAccess(role: UserRole, route: string): boolean {
  const config = ROLE_PERMISSIONS[role];

  // Verifica se a rota é pública
  if (PUBLIC_ROUTES.some(publicRoute => route.startsWith(publicRoute))) {
    return true;
  }

  // Verifica se o usuário tem acesso à rota
  return config?.routes.some(allowedRoute => route.startsWith(allowedRoute)) ?? false;
}

/**
 * Verifica se o usuário tem acesso ao dashboard
 */
export function hasAccessToDashboard(role: UserRole): boolean {
  return hasPermission(role, 'view_dashboard');
}

/**
 * Verifica se o usuário é admin ou superior
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'superadmin' || role === 'admin';
}

/**
 * Verifica se o usuário é superadmin
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'superadmin';
}

/**
 * Obtém o nome de exibição da role
 */
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_PERMISSIONS[role]?.displayName ?? 'Desconhecido';
}

/**
 * Obtém todas as permissões de uma role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role]?.permissions ?? [];
}

/**
 * Obtém a rota padrão para uma role após login
 */
export function getDefaultRouteForRole(role: UserRole): string {
  if (hasAccessToDashboard(role)) {
    return '/dashboard';
  }
  return '/agendamento';
}

/**
 * Valida se uma role é válida
 */
export function isValidRole(role: string): role is UserRole {
  return ['superadmin', 'admin', 'atendente', 'user'].includes(role);
}
