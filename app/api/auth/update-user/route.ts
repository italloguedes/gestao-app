import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route para atualizar usuários do Supabase Auth
 * Permite atualizar: email, password, user_metadata (nome, telefone, etc)
 * Requer service_role key (admin)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, password, user_metadata, phone } = body;

    // Validar userId
    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
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

    // Preparar dados para atualização
    const updateData: any = {};

    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (phone) updateData.phone = phone;
    if (user_metadata) updateData.user_metadata = user_metadata;

    // Atualizar usuário no Auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (error) {
      console.error('Erro ao atualizar usuário do Auth:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário', details: error.message },
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
        updated_at: data.user.updated_at
      }
    });

  } catch (error) {
    console.error('Erro inesperado ao atualizar usuário:', error);
    return NextResponse.json(
      { error: 'Erro inesperado ao processar requisição' },
      { status: 500 }
    );
  }
}
