/**
 * Hook para gerenciar permissões do usuário
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
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
  const { user, loading: authLoading, ensureValidSession } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const sessionValid = await ensureValidSession();
        if (!sessionValid) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao buscar role do usuário:', error);
          setRole(null);
          setLoading(false);
          return;
        }

        if (!userData) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('role')
            .eq('email', user.email)
            .single();

          if (userByEmail) {
            setRole(userByEmail.role as UserRole);
            setLoading(false);
            return;
          }

          setRole('user');
          setLoading(false);
          return;
        }

        setRole(userData.role as UserRole);
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
  }, [user, authLoading, ensureValidSession]);

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
