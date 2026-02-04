import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

// Configuração de runtime para Vercel
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * API Route para criar usuários no Supabase Auth
 * Requer autenticação e role: superadmin
 * Permite criar usuários com email, senha e metadata
 * Requer service_role key (admin)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const authCheck = await checkAuth(request, 'superadmin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas super administradores podem criar usuários');
    }

    const body = await request.json();
    const { email, password, user_metadata, phone, email_confirm = true, name, role = 'user', status = 'active' } = body;

    // Validar dados obrigatórios
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      );
    }

    // Criar cliente admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Preparar user_metadata com role e status
    const finalMetadata = {
      ...(user_metadata || {}),
      full_name: name || user_metadata?.full_name || user_metadata?.name || email.split('@')[0],
      name: name || user_metadata?.name || email.split('@')[0],
      role: role,
      status: status
    };

    // Preparar dados para criação
    const createData: any = {
      email,
      email_confirm, // Se true, não envia email de confirmação
      user_metadata: finalMetadata
    };

    if (password) createData.password = password;
    if (phone) createData.phone = phone;

    // Criar usuário no Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser(createData);

    if (error) {
      console.error('Erro ao criar usuário no Auth:', error);
      return NextResponse.json(
        { error: 'Erro ao criar usuário', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      }
    });

  } catch (error) {
    console.error('Erro inesperado ao criar usuário:', error);
    return NextResponse.json(
      { error: 'Erro inesperado ao processar requisição' },
      { status: 500 }
    );
  }
}
