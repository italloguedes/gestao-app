'use client';

import { useState } from 'react';
import { User } from '@/lib/models/User';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase-client';

/**
 * Hook para operações com usuários via API
 * Usa Auth Admin API através das rotas /api/users
 */
export const useUserOperations = () => {
  const { users, setUsers, setLoading, setError } = useUser();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  /**
   * Helper para fazer requisições autenticadas
   */
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Não autenticado');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  /**
   * Busca todos os usuários via API
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth('/api/users');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar usuários');
      }

      const data = await response.json();
      setUsers(data as User[]);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message || 'Erro ao carregar usuários');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cria um novo usuário via API
   */
  const createUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Creating user with data:', userData);
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!userData.name || !userData.email || !userData.role || !userData.status) {
        throw new Error('Todos os campos são obrigatórios');
      }

      const response = await fetchWithAuth('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Erro ao criar usuário');
      }

      const newUser = await response.json();
      console.log('User created successfully:', newUser);
      setUsers((prevUsers) => [newUser as User, ...prevUsers]);
      return newUser as User;
    } catch (error: any) {
      console.error('Error in createUser:', error);
      const errorMessage = error.message || 'Erro ao criar usuário';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza um usuário via API
   */
  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields if they are present
      if (userData.name === '') throw new Error('Nome é obrigatório');
      if (userData.email === '') throw new Error('Email é obrigatório');

      const response = await fetchWithAuth(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Erro ao atualizar usuário');
      }

      const updatedUser = await response.json();
      setUsers((prevUsers) =>
        prevUsers.map(user => user.id === id ? { ...user, ...updatedUser } as User : user)
      );
      return updatedUser as User;
    } catch (error: any) {
      console.error('Error updating user:', error);
      const errorMessage = error.message || 'Erro ao atualizar usuário';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exclui um usuário via API
   */
  const deleteUser = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Erro ao excluir usuário');
      }

      setUsers((prevUsers) => prevUsers.filter(user => user.id !== id));
      return true;
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error.message || 'Erro ao excluir usuário';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    selectedUser,
    setSelectedUser,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  };
};
