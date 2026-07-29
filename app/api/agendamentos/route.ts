import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { sendEmailConfirmation } from '@/lib/emailService';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

// Configuração de runtime para Vercel
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // Verificar autenticação e permissões (requer atendente, admin ou superadmin)
  const authCheck = await checkAuth(request, 'atendente');

  if (!authCheck.authenticated) {
    return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
  }

  if (!authCheck.authorized) {
    return forbiddenResponse(authCheck.error || 'Apenas atendentes e administradores podem criar agendamentos');
  }

  try {
    const { nome, cpf, telefone, email, data, horario, data_nascimento, atendimento_preferencial, posto } = await request.json();

    // Validações básicas
    if (!nome || !cpf || !telefone || !data || !horario || !data_nascimento) {
      return NextResponse.json(
        { error: 'Nome, CPF, telefone, data, horário e data de nascimento são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe um agendamento com o mesmo CPF na mesma data
    const { data: existingCpfAppointment, error: cpfCheckError } = await supabase
      .from('agendamentos')
      .select('id, nome')
      .eq('cpf', cpf)
      .eq('data', data)
      .in('status', ['confirmado', 'bloqueado', 'concluido', 'ausente']);

    if (cpfCheckError) {
      console.error('Erro ao verificar CPF duplicado:', cpfCheckError);
      return NextResponse.json(
        { error: 'Erro ao verificar CPF duplicado' },
        { status: 500 }
      );
    }

    // Não permitir CPF duplicado na mesma data
    if (existingCpfAppointment && existingCpfAppointment.length > 0) {
      return NextResponse.json(
        { error: `Já existe um agendamento para o CPF ${cpf} na data ${data}. Nome: ${existingCpfAppointment[0].nome}` },
        { status: 409 }
      );
    }

    // Verificar quantos agendamentos ativos já existem no mesmo horário e posto
    const postoAtual = posto || 'Sala Sensorial';
    const { data: existingAppointments, error: checkError } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('data', data)
      .eq('horario', horario)
      .eq('posto', postoAtual)
      .in('status', ['confirmado', 'bloqueado', 'concluido', 'ausente', 'chamando']);

    if (checkError) {
      console.error('Erro ao verificar agendamentos existentes:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar disponibilidade de horário' },
        { status: 500 }
      );
    }

    // Permitir apenas 1 agendamento por horário por posto
    if (existingAppointments && existingAppointments.length >= 1) {
      return NextResponse.json(
        { error: `O horário ${horario} no posto '${postoAtual}' acabou de ser reservado por outro atendente. Por favor, escolha outro horário livre.` },
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
        posto: postoAtual,
        status: 'confirmado',
        user_id: authCheck.user?.id || null
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

export async function PUT(request: NextRequest) {
  // Verificar autenticação e permissões (requer atendente, admin ou superadmin)
  const authCheck = await checkAuth(request, 'atendente');

  if (!authCheck.authenticated) {
    return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
  }

  if (!authCheck.authorized) {
    return forbiddenResponse(authCheck.error || 'Apenas atendentes e administradores podem atualizar agendamentos');
  }

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
