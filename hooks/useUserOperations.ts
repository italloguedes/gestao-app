'use client';

import { useState } from 'react';
import { User } from '@/lib/models/User';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';

export const useUserOperations = () => {
  const { users, setUsers, setLoading, setError } = useUser();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      setUsers(data as User[]);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message || 'Erro ao carregar usuários');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Creating user with data:', userData);
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!userData.name || !userData.email || !userData.role || !userData.status) {
        throw new Error('Todos os campos são obrigatórios');
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: userData.name,
          email: userData.email,
          role: userData.role,
          status: userData.status
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating user:', error);
        if (error.code === '23505') {
          throw new Error('Este email já está em uso');
        }
        throw error;
      }

      if (!data) {
        throw new Error('Erro ao criar usuário: nenhum dado retornado');
      }

      console.log('User created successfully:', data);
      setUsers((prevUsers) => [data as User, ...prevUsers]);
      return data as User;
    } catch (error: any) {
      console.error('Error in createUser:', error);
      const errorMessage = error.message || 'Erro ao criar usuário';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields if they are present
      if (userData.name === '') throw new Error('Nome é obrigatório');
      if (userData.email === '') throw new Error('Email é obrigatório');

      const { data, error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        if (error.code === '23505') {
          throw new Error('Este email já está em uso');
        }
        throw error;
      }

      setUsers((prevUsers) => 
        prevUsers.map(user => user.id === id ? { ...user, ...data } as User : user)
      );
      return data as User;
    } catch (error: any) {
      console.error('Error updating user:', error);
      const errorMessage = error.message || 'Erro ao atualizar usuário';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting user:', error);
        throw error;
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