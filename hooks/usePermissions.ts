/**
 * Hook para gerenciar permissões do usuário
 * Usa user_metadata do Supabase Auth para obter a role
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = () => {
      try {
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        // Obter role diretamente do user_metadata
        const userRole = user.user_metadata?.role as UserRole || 'user';
        setRole(userRole);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        setRole(null);
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserRole();
    }
  }, [user, authLoading]);

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
