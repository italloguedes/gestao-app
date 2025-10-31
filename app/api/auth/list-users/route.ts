import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

/**
 * API Route para listar usuários do Supabase Auth
 * Requer autenticação e role: superadmin
 * Requer service_role key (admin) para acessar auth.admin.listUsers()
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const authCheck = await checkAuth(request, 'superadmin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas super administradores podem listar usuários');
    }
    // Verificar se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variáveis de ambiente não configuradas:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta. Verifique as variáveis de ambiente.' },
        { status: 500 }
      );
    }

    // Criar cliente Supabase com service_role key (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Buscar todos os usuários do Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Erro ao buscar usuários do Auth:', authError);
      return NextResponse.json(
        { error: 'Erro ao buscar usuários do Supabase Auth', details: authError.message },
        { status: 500 }
      );
    }

    // Buscar usuários já vinculados na tabela users
    const { data: existingUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('auth_id')
      .not('auth_id', 'is', null);

    if (usersError) {
      console.error('Erro ao buscar usuários vinculados:', usersError);
      return NextResponse.json(
        { error: 'Erro ao buscar usuários vinculados', details: usersError.message },
        { status: 500 }
      );
    }

    // Criar Set de auth_ids já vinculados
    const linkedAuthIds = new Set(existingUsers?.map(u => u.auth_id) || []);

    // Formatar dados dos usuários do Auth
    const authUsers = authData.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      user_metadata: user.user_metadata,
      is_linked: linkedAuthIds.has(user.id)
    }));

    return NextResponse.json({
      users: authUsers,
      total: authUsers.length,
      linked: linkedAuthIds.size,
      available: authUsers.filter(u => !u.is_linked).length
    });

  } catch (error) {
    console.error('Erro inesperado ao listar usuários do Auth:', error);
    return NextResponse.json(
      { error: 'Erro inesperado ao processar requisição' },
      { status: 500 }
    );
  }
}
