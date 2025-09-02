import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { sendEmailConfirmation } from '@/lib/emailService';

export async function POST(request: Request) {
  try {
    const { nome, cpf, telefone, email, data, horario, data_nascimento, atendimento_preferencial } = await request.json();

    // Validações básicas
    if (!nome || !cpf || !telefone || !data || !horario || !data_nascimento) {
      return NextResponse.json(
        { error: 'Nome, CPF, telefone, data, horário e data de nascimento são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar quantos agendamentos já existem no mesmo horário
    const { data: existingAppointments, error: checkError } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('data', data)
      .eq('horario', horario)
      .in('status', ['confirmado', 'bloqueado']);

    if (checkError) {
      console.error('Erro ao verificar agendamentos existentes:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar disponibilidade' },
        { status: 500 }
      );
    }

    // Permitir até 2 agendamentos por horário
    if (existingAppointments && existingAppointments.length >= 2) {
      return NextResponse.json(
        { error: 'Este horário já está completo (máximo 2 agendamentos por horário)' },
        { status: 409 }
      );
    }

    // Criar o agendamento
    const { data: newAppointment, error } = await supabase
      .from('agendamentos')
      .insert({
        nome,
        cpf,
        telefone,
        email: email || null,
        data,
        horario,
        data_nascimento,
        atendimento_preferencial: atendimento_preferencial || false,
        status: 'confirmado'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar agendamento:', error);
      return NextResponse.json(
        { error: 'Erro ao criar agendamento' },
        { status: 500 }
      );
    }

    // Enviar email de confirmação se email foi fornecido
    if (email) {
      try {
        await sendEmailConfirmation(newAppointment);
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Não retornamos erro aqui para não falhar a criação do agendamento
      }
    }

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

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
