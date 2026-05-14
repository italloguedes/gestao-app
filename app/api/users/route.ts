import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

// Configuração de runtime para Vercel
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Helper para criar cliente admin do Supabase
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configuração do servidor incompleta');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Mapeia usuário do Auth para formato esperado pelo frontend
 */
function mapAuthUserToUser(authUser: any) {
  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
    role: authUser.user_metadata?.role || 'user',
    status: authUser.user_metadata?.status || 'active',
    phone: authUser.phone || authUser.user_metadata?.phone || '',
    avatar_url: authUser.user_metadata?.avatar_url || '',
    funcao: authUser.user_metadata?.funcao || '',
    matricula: authUser.user_metadata?.matricula || '',
    cpf: authUser.user_metadata?.cpf || '',
    assinatura_url: authUser.user_metadata?.assinatura_url || '',
    created_at: authUser.created_at,
    updated_at: authUser.updated_at
  };
}

/**
 * GET /api/users - Lista todos os usuários do Supabase Auth
 * Requer role: admin ou superadmin
 */
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAuth(request, 'admin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas administradores podem listar usuários');
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Buscar todos os usuários do Auth com paginação
    let allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });

      if (authError) {
        console.error('Erro ao buscar usuários do Auth:', authError);
        return NextResponse.json(
          { error: 'Erro ao buscar usuários', details: authError.message },
          { status: 500 }
        );
      }

      const users = authData?.users || [];

      if (users.length > 0) {
        allUsers = [...allUsers, ...users];

        if (users.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    // Mapear para formato esperado pelo frontend
    const mappedUsers = allUsers.map(mapAuthUserToUser);

    return NextResponse.json(mappedUsers);
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Cria um novo usuário no Supabase Auth
 * Requer role: superadmin
 */
export async function POST(request: NextRequest) {
  try {
    const authCheck = await checkAuth(request, 'superadmin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas super administradores podem criar usuários');
    }

    const body = await request.json();
    const { email, password, name, role = 'user', status = 'active', phone, funcao, matricula, cpf, assinatura_url } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Criar usuário no Auth com user_metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      phone,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        name: name,
        role: role,
        status: status,
        funcao: funcao || '',
        matricula: matricula || '',
        cpf: cpf || '',
        assinatura_url: assinatura_url || ''
      }
    });

    if (error) {
      console.error('Erro ao criar usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao criar usuário', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(mapAuthUserToUser(data.user), { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
