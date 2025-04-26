import { supabase } from '../supabase';

export type UserRole = 'admin' | 'atendente' | 'user';

export interface User {
  id?: number;  // Changed from string (UUID) to number (SERIAL)
  auth_id?: string;  // Changed from UUID to TEXT
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export async function initializeDatabase() {
  try {
    console.log('Iniciando inicialização do banco de dados...');

    // Check if the users table exists and has the correct structure
    const { data: tableCheck, error: queryError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    console.log('Verificação da tabela:', { data: tableCheck, error: queryError });

    if (queryError) {
      console.error('Erro ao acessar tabela users:', {
        code: queryError.code,
        message: queryError.message,
        details: queryError.details
      });
      return { success: false, error: queryError };
    }

    // Check if there's an admin user
    const { data: existingAdmin, error: adminCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .single();

    console.log('Verificação de admin existente:', { 
      exists: !!existingAdmin,
      error: adminCheckError 
    });

    if (adminCheckError && adminCheckError.code !== 'PGRST116') {
      console.error('Erro ao verificar usuário admin:', {
        code: adminCheckError.code,
        message: adminCheckError.message,
        details: adminCheckError.details
      });
      return { success: false, error: adminCheckError };
    }

    // If no admin exists, create one
    if (!existingAdmin) {
      console.log('Criando usuário admin inicial...');
      
      const adminData = {
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin' as const,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newAdmin, error: insertError } = await supabase
        .from('users')
        .insert([adminData])
        .select()
        .single();

      console.log('Resultado da criação do admin:', {
        success: !!newAdmin,
        error: insertError,
        admin: newAdmin
      });

      if (insertError) {
        console.error('Erro ao criar usuário admin:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details
        });
        return { success: false, error: insertError };
      }

      return { success: true, data: newAdmin };
    }

    return { success: true, data: existingAdmin };
  } catch (error) {
    console.error('Erro na inicialização do banco:', error);
    return { success: false, error };
  }
}

export async function getUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export async function getUserById(id: number) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as User;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function getUserByAuthId(authId: string) {
  try {
    if (!authId) {
      throw new Error('Auth ID is required');
    }

    console.log('Fetching user with auth_id:', authId);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();

    console.log('Supabase response:', {
      data: data ? 'found' : 'not found',
      error: error ? {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      } : null
    });

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No user found with this auth_id - this is normal for new users');
        return null;
      }
      throw error;
    }

    return data as User;
  } catch (error) {
    console.error('Error fetching user by auth_id:', error);
    throw error;
  }
}

export async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return data as User;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(id: number, userData: Partial<User>) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function deleteUser(id: number) {
  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// Função para verificar se o usuário tem acesso ao dashboard
export const hasAccessToDashboard = (role: UserRole): boolean => {
  return role === 'admin' || role === 'atendente';
};

// Função para verificar se o usuário tem permissões de admin
export const isAdmin = (role: UserRole): boolean => {
  return role === 'admin';
}; 