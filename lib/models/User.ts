import { supabase } from '../supabase-client';

export type UserRole = 'superadmin' | 'admin' | 'atendente' | 'user';

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
    console.log('Verificando conexão com o Supabase...');

    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Erro na conexão com o Supabase:', {
        code: testError.code,
        message: testError.message,
        details: testError.details,
        hint: testError.hint
      });
      return { success: false, error: testError };
    }

    console.log('Conexão com o Supabase estabelecida com sucesso');
    return { success: true };
  } catch (error) {
    console.error('Erro na inicialização do banco:', error);
    return { success: false, error };
  }
}

export async function getUsers() {
  try {
    // Buscar todos os usuários com paginação automática
    // O Supabase tem limite padrão de 1000 registros
    console.log('=== BUSCA DE USUÁRIOS DA TABELA ===');
    let allUsers: User[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data && data.length > 0) {
        allUsers = [...allUsers, ...data];
        console.log(`Página ${page + 1}: ${data.length} usuários encontrados (Total acumulado: ${allUsers.length})`);
        
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`Total de usuários da tabela buscados: ${allUsers.length}`);
    console.log('===================================');
    
    return allUsers as User[];
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
    console.log('Iniciando criação de usuário com dados:', userData);

    // Validate required fields
    if (!userData.name || !userData.email || !userData.role || !userData.status) {
      const error = new Error('Todos os campos são obrigatórios');
      console.error('Erro de validação:', error);
      throw error;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      const error = new Error('Formato de email inválido');
      console.error('Erro de validação de email:', error);
      throw error;
    }

    // Validate role
    const validRoles = ['superadmin', 'admin', 'atendente', 'user'];
    if (!validRoles.includes(userData.role)) {
      const error = new Error('Função inválida');
      console.error('Erro de validação de função:', error);
      throw error;
    }

    // Validate status
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(userData.status)) {
      const error = new Error('Status inválido');
      console.error('Erro de validação de status:', error);
      throw error;
    }

    console.log('Dados validados com sucesso, tentando inserir no banco...');

    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    console.log('Resposta do Supabase:', {
      success: !!data,
      error: error ? {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      } : null,
      data
    });

    if (error) {
      console.error('Erro ao criar usuário no Supabase:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Handle specific error cases
      if (error.code === '23505') {
        throw new Error('Este email já está em uso');
      }
      throw error;
    }

    if (!data) {
      const error = new Error('Nenhum dado retornado após a criação do usuário');
      console.error('Erro na criação do usuário:', error);
      throw error;
    }

    console.log('Usuário criado com sucesso:', data);
    return data as User;
  } catch (error) {
    console.error('Erro na função createUser:', error);
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
