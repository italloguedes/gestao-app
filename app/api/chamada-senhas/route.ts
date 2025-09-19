import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

// Interface para chamada de senha
interface ChamadaSenha {
  id: number;
  agendamento_id: number;
  nome: string;
  horario: string;
  status: 'chamada' | 'atendido' | 'ausente';
  data_chamada: string;
  atendente_id?: string;
  observacoes?: string;
}

// GET - Buscar chamadas ativas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'chamada';
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0];
    const limit = parseInt(searchParams.get('limit') || '50'); // Aumentar limite para admin

    console.log('🔍 Buscando chamadas:', { status, data, limit });

    const { data: chamadas, error } = await supabase
      .from('chamada_senhas')
      .select(`
        *,
        agendamentos (
          id,
          nome,
          horario,
          data,
          status,
          atendimento_preferencial
        )
      `)
      .eq('data_chamada', data)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao buscar chamadas:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar chamadas' },
        { status: 500 }
      );
    }

    console.log('✅ Chamadas encontradas:', chamadas?.length || 0);

    // Ordenar chamadas: preferenciais primeiro, depois por horário
    const chamadasOrdenadas = (chamadas || []).sort((a, b) => {
      // Primeiro: atendimentos preferenciais
      const aPreferencial = a.agendamentos?.atendimento_preferencial || false;
      const bPreferencial = b.agendamentos?.atendimento_preferencial || false;
      
      if (aPreferencial && !bPreferencial) return -1;
      if (!aPreferencial && bPreferencial) return 1;
      
      // Segundo: por horário (mais cedo primeiro)
      const aHorario = a.horario || '00:00:00';
      const bHorario = b.horario || '00:00:00';
      
      return aHorario.localeCompare(bHorario);
    });

    return NextResponse.json(chamadasOrdenadas);
  } catch (error) {
    console.error('❌ Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar nova chamada de senha
export async function POST(request: Request) {
  try {
    const { agendamento_id, atendente_id, observacoes } = await request.json();

    console.log('📢 Criando nova chamada:', { agendamento_id, atendente_id });

    if (!agendamento_id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar dados do agendamento
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', agendamento_id)
      .single();

    if (agendamentoError || !agendamento) {
      console.error('❌ Agendamento não encontrado:', agendamentoError);
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Agendamento encontrado:', agendamento.nome);

    // Verificar se já existe chamada ativa para este agendamento hoje
    const hoje = new Date().toISOString().split('T')[0];
    const { data: chamadaExistente } = await supabase
      .from('chamada_senhas')
      .select('id')
      .eq('agendamento_id', agendamento_id)
      .eq('data_chamada', hoje)
      .eq('status', 'chamada')
      .single();

    // Se já existe chamada, atualizar timestamp para "rechamar"
    if (chamadaExistente) {
      console.log('🔄 Atualizando chamada existente (rechamar)');
      
      const { data: chamadaAtualizada, error: updateError } = await supabase
        .from('chamada_senhas')
        .update({
          created_at: new Date().toISOString(),
          observacoes: observacoes
        })
        .eq('id', chamadaExistente.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erro ao atualizar chamada:', updateError);
        return NextResponse.json(
          { error: 'Erro ao rechamar senha' },
          { status: 500 }
        );
      }

      console.log('✅ Chamada atualizada com sucesso (rechamar)');
      return NextResponse.json({
        ...chamadaAtualizada,
        success: true,
        message: `Rechamada realizada para ${agendamento.nome}`,
        isRechamar: true
      }, { status: 200 });
    }

    // Criar nova chamada
    const { data: novaChamada, error: chamadaError } = await supabase
      .from('chamada_senhas')
      .insert({
        agendamento_id,
        nome: agendamento.nome,
        horario: agendamento.horario,
        status: 'chamada',
        data_chamada: hoje,
        atendente_id,
        observacoes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (chamadaError) {
      console.error('❌ Erro ao criar chamada:', chamadaError);
      return NextResponse.json(
        { error: 'Erro ao criar chamada' },
        { status: 500 }
      );
    }

    console.log('✅ Chamada criada com sucesso:', novaChamada.id);

    // Atualizar status do agendamento para "chamado"
    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({ status: 'chamado' })
      .eq('id', agendamento_id);

    if (updateError) {
      console.error('⚠️ Erro ao atualizar status do agendamento:', updateError);
      // Não falhar a operação por causa disso
    }

    console.log('✅ Status do agendamento atualizado para "chamado"');

    return NextResponse.json({
      ...novaChamada,
      success: true,
      message: `Chamada criada para ${agendamento.nome}`
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar status da chamada
export async function PUT(request: Request) {
  try {
    const { id, status, observacoes } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID e status são obrigatórios' },
        { status: 400 }
      );
    }

    const { data: chamada, error } = await supabase
      .from('chamada_senhas')
      .update({
        status,
        observacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar chamada:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar chamada' },
        { status: 500 }
      );
    }

    // Se marcado como atendido, atualizar agendamento para concluído
    if (status === 'atendido') {
      await supabase
        .from('agendamentos')
        .update({ status: 'concluido' })
        .eq('id', chamada.agendamento_id);
    }

    return NextResponse.json(chamada);
  } catch (error) {
    console.error('❌ Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Remover chamada
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('chamada_senhas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar chamada:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar chamada' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Chamada removida com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}