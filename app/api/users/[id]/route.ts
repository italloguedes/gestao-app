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
    assinatura_url: authUser.user_metadata?.assinatura_url || '',
    created_at: authUser.created_at,
    updated_at: authUser.updated_at
  };
}

/**
 * Extrai o ID do usuário da URL
 * Agora aceita UUID (string) em vez de número
 */
function getUserIdFromUrl(url: string): string | null {
  const segments = url.split('/');
  const id = segments.pop() || segments.pop(); // Handle trailing slash
  return id && id.length > 0 ? id : null;
}

/**
 * GET /api/users/[id] - Busca um usuário específico
 * Requer role: admin ou superadmin
 */
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAuth(request, 'admin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas administradores podem visualizar usuários');
    }

    const userId = getUserIdFromUrl(request.url);

    if (!userId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar usuário', details: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json(mapAuthUserToUser(data.user));
  } catch (error: any) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/users/[id] - Atualiza um usuário
 * Requer role: admin ou superadmin
 */
export async function PUT(request: NextRequest) {
  try {
    const authCheck = await checkAuth(request, 'admin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas administradores podem atualizar usuários');
    }

    const userId = getUserIdFromUrl(request.url);

    if (!userId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { email, password, name, role, status, phone, avatar_url, funcao, matricula, assinatura_url } = body;

    const supabaseAdmin = getSupabaseAdmin();

    // Primeiro, buscar o usuário atual para mesclar user_metadata
    const { data: currentUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (fetchError || !currentUser.user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const updateData: any = {};

    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (phone) updateData.phone = phone;

    // Mesclar user_metadata existente com novos valores
    const currentMetadata = currentUser.user.user_metadata || {};
    const newMetadata: any = { ...currentMetadata };

    if (name !== undefined) {
      newMetadata.full_name = name;
      newMetadata.name = name;
    }
    if (role !== undefined) newMetadata.role = role;
    if (status !== undefined) newMetadata.status = status;
    if (avatar_url !== undefined) newMetadata.avatar_url = avatar_url;
    if (funcao !== undefined) newMetadata.funcao = funcao;
    if (matricula !== undefined) newMetadata.matricula = matricula;
    if (assinatura_url !== undefined) newMetadata.assinatura_url = assinatura_url;

    updateData.user_metadata = newMetadata;

    // Atualizar usuário
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);

    if (error) {
      console.error('Erro ao atualizar usuário no auth:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário no auth', details: error.message },
        { status: 400 }
      );
    }

    // Try to update public.users table as well to keep data in sync
    try {
      const publicUpdateData: any = {};
      if (email) publicUpdateData.email = email;
      if (name !== undefined) publicUpdateData.name = name;
      if (role !== undefined) publicUpdateData.role = role;
      if (status !== undefined) publicUpdateData.status = status;
      publicUpdateData.updated_at = new Date().toISOString();

      const { error: publicError } = await supabaseAdmin
        .from('users')
        .update(publicUpdateData)
        .eq('auth_id', userId);

      if (publicError) {
        console.warn('Erro não-fatal: Falha ao atualizar public.users:', publicError);
      }
    } catch (e) {
      console.warn('Erro não-fatal: Exceção ao atualizar public.users:', e);
    }

    return NextResponse.json(mapAuthUserToUser(data.user));
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id] - Remove um usuário
 * Requer role: superadmin
 */
export async function DELETE(request: NextRequest) {
  try {
    const authCheck = await checkAuth(request, 'superadmin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas super administradores podem excluir usuários');
    }

    const userId = getUserIdFromUrl(request.url);

    if (!userId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Erro ao excluir usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir usuário', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Usuário excluído com sucesso' });
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
