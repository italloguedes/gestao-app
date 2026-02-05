/**
 * Modelo de Usuário - Usa Supabase Auth com user_metadata
 * 
 * Os dados do usuário são armazenados em auth.users com:
 * - id: UUID do Supabase Auth
 * - email: email do usuário
 * - user_metadata.full_name: nome completo
 * - user_metadata.role: 'superadmin' | 'admin' | 'atendente' | 'recepcao' | 'user'
 * - user_metadata.status: 'active' | 'inactive'
 * - user_metadata.avatar_url: URL da foto de perfil
 * - user_metadata.phone: telefone
 */

export type UserRole = 'superadmin' | 'admin' | 'atendente' | 'recepcao' | 'user';

export interface User {
  id: string;  // UUID do auth.users
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
  phone?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Mapeia usuário do Supabase Auth para interface User
 */
export function mapAuthUserToUser(authUser: any): User {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
    role: authUser.user_metadata?.role || 'user',
    status: authUser.user_metadata?.status || 'active',
    phone: authUser.phone || authUser.user_metadata?.phone || '',
    avatar_url: authUser.user_metadata?.avatar_url || '',
    created_at: authUser.created_at,
    updated_at: authUser.updated_at
  };
}

/**
 * Converte dados do User para formato de user_metadata do Auth
 */
export function userToMetadata(user: Partial<User>): Record<string, any> {
  const metadata: Record<string, any> = {};

  if (user.name !== undefined) {
    metadata.full_name = user.name;
    metadata.name = user.name;
  }
  if (user.role !== undefined) metadata.role = user.role;
  if (user.status !== undefined) metadata.status = user.status;
  if (user.avatar_url !== undefined) metadata.avatar_url = user.avatar_url;
  if (user.phone !== undefined) metadata.phone = user.phone;

  return metadata;
}

// Função para verificar se o usuário tem acesso ao dashboard
export const hasAccessToDashboard = (role: UserRole): boolean => {
  return role === 'superadmin' || role === 'admin' || role === 'atendente';
};

// Função para verificar se o usuário tem permissões de admin
export const isAdmin = (role: UserRole): boolean => {
  return role === 'superadmin' || role === 'admin';
};

// Função para verificar se o usuário tem permissões de superadmin
export const isSuperAdmin = (role: UserRole): boolean => {
  return role === 'superadmin';
};

/**
 * Extrai a role do usuário a partir do user_metadata
 * @param user - Objeto User do Supabase Auth (session.user)
 */
export function getUserRole(user: any): UserRole {
  return user?.user_metadata?.role || 'user';
}

/**
 * Extrai o nome do usuário a partir do user_metadata
 * @param user - Objeto User do Supabase Auth (session.user)
 */
export function getUserName(user: any): string {
  return user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Usuário';
}

/**
 * Verifica se o usuário está ativo
 * @param user - Objeto User do Supabase Auth (session.user)
 */
export function isUserActive(user: any): boolean {
  return user?.user_metadata?.status !== 'inactive';
}
