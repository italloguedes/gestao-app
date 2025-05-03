import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmailConfirmation } from '@/lib/emailService';

export async function PUT(request: Request) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID e status são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o agendamento existe
    const { data: existingAgendamento, error: fetchError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar agendamento:', fetchError);
      return NextResponse.json(
        { error: 'Erro ao buscar agendamento' },
        { status: 500 }
      );
    }

    if (!existingAgendamento) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar o status
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar agendamento:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar agendamento' },
        { status: 500 }
      );
    }

    // Enviar email de confirmação se o status mudou
    if (existingAgendamento.status !== status) {
      try {
        await sendEmailConfirmation(data);
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Não retornamos erro aqui para não falhar a atualização do status
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 