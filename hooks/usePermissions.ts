/**
 * Hook para gerenciar permissões do usuário
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import {
  UserRole,
  Permission,
  hasPermission,
  hasRouteAccess,
  isAdmin,
  isSuperAdmin,
  hasAccessToDashboard,
  getRoleDisplayName,
  getRolePermissions,
} from '@/lib/auth/permissions';

interface UsePermissionsReturn {
  role: UserRole | null;
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasRouteAccess: (route: string) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasAccessToDashboard: boolean;
  roleDisplayName: string;
  permissions: Permission[];
}

export function usePermissions(): UsePermissionsReturn {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setRole(null);
          return;
        }

        // Busca o role do usuário na tabela users
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao buscar role do usuário:', error);
          setRole(null);
          return;
        }

        // Se não encontrou por auth_id, tenta por email
        if (!userData) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('role')
            .eq('email', user.email)
            .single();

          if (userByEmail) {
            setRole(userByEmail.role as UserRole);
            return;
          }

          // Se não encontrou, considera como 'user'
          setRole('user');
          return;
        }

        setRole(userData.role as UserRole);
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Atualiza quando houver mudança de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    role,
    loading,
    hasPermission: (permission: Permission) => role ? hasPermission(role, permission) : false,
    hasRouteAccess: (route: string) => role ? hasRouteAccess(role, route) : false,
    isAdmin: role ? isAdmin(role) : false,
    isSuperAdmin: role ? isSuperAdmin(role) : false,
    hasAccessToDashboard: role ? hasAccessToDashboard(role) : false,
    roleDisplayName: role ? getRoleDisplayName(role) : 'Visitante',
    permissions: role ? getRolePermissions(role) : [],
  };
}
