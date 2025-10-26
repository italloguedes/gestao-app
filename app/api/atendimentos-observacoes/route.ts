import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

// GET - Listar observações de um atendimento
export async function GET(request: NextRequest) {
  // Verificar autenticação e permissões (requer atendente, admin ou superadmin)
  const authCheck = await checkAuth(request, 'atendente');

  if (!authCheck.authenticated) {
    return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
  }

  if (!authCheck.authorized) {
    return forbiddenResponse(authCheck.error || 'Apenas atendentes e administradores podem visualizar observações');
  }

  try {
    const { searchParams } = new URL(request.url);
    const atendimentoId = searchParams.get('atendimento_id');

    if (!atendimentoId) {
      return NextResponse.json(
        { error: 'ID do atendimento é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar observações do atendimento
    const { data: observacoes, error } = await supabase
      .from('atendimento_observacoes_historico')
      .select('*')
      .eq('atendimento_id', atendimentoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar observações:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar observações' },
        { status: 500 }
      );
    }

    return NextResponse.json(observacoes || []);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Adicionar nova observação
export async function POST(request: NextRequest) {
  // Verificar autenticação e permissões (requer atendente, admin ou superadmin)
  const authCheck = await checkAuth(request, 'atendente');

  if (!authCheck.authenticated) {
    return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
  }

  if (!authCheck.authorized) {
    return forbiddenResponse(authCheck.error || 'Apenas atendentes e administradores podem adicionar observações');
  }

  try {
    const { atendimento_id, observacao, usuario_email, usuario_nome } = await request.json();

    // Validações básicas
    if (!atendimento_id || !observacao) {
      return NextResponse.json(
        { error: 'ID do atendimento e observação são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar que a observação não está vazia (apenas espaços)
    if (observacao.trim().length === 0) {
      return NextResponse.json(
        { error: 'Observação não pode estar vazia' },
        { status: 400 }
      );
    }

    // Verificar se o atendimento existe
    const { data: atendimento, error: fetchError } = await supabase
      .from('atendimentos')
      .select('id')
      .eq('id', atendimento_id)
      .single();

    if (fetchError || !atendimento) {
      return NextResponse.json(
        { error: 'Atendimento não encontrado' },
        { status: 404 }
      );
    }

    // Criar a observação
    const { data: novaObservacao, error } = await supabase
      .from('atendimento_observacoes_historico')
      .insert({
        atendimento_id,
        observacao: observacao.trim(),
        usuario_email,
        usuario_nome
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar observação:', error);
      return NextResponse.json(
        { error: 'Erro ao criar observação' },
        { status: 500 }
      );
    }

    return NextResponse.json(novaObservacao, { status: 201 });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
