import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route para criar usuários no Supabase Auth
 * Permite criar usuários com email, senha e metadata
 * Requer service_role key (admin)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, user_metadata, phone, email_confirm = true } = body;

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

    // Preparar dados para criação
    const createData: any = {
      email,
      email_confirm, // Se true, não envia email de confirmação
    };

    if (password) createData.password = password;
    if (phone) createData.phone = phone;
    if (user_metadata) createData.user_metadata = user_metadata;

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
