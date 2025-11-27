import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

/**
 * POST /api/agendamentos/fila/chamar-proximo
 * Chama o próximo agendamento da fila seguindo a lógica de prioridade
 */
export async function POST(request: NextRequest) {
    // Verificar autenticação e permissões
    const authCheck = await checkAuth(request, 'atendente');

    if (!authCheck.authenticated) {
        return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
        return forbiddenResponse(authCheck.error || 'Apenas atendentes e administradores podem chamar agendamentos');
    }

    try {
        const hoje = new Date().toISOString().split('T')[0];
        const { userId, userName } = await request.json();

        if (!userId || !userName) {
            return NextResponse.json(
                { error: 'userId e userName são obrigatórios' },
                { status: 400 }
            );
        }

        // Buscar todos os agendamentos confirmados de hoje
        const { data: agendamentos, error: fetchError } = await supabase
            .from('agendamentos')
            .select('*')
            .eq('data', hoje)
            .eq('status', 'pendente')
            .order('horario', { ascending: true });

        if (fetchError) {
            console.error('Erro ao buscar agendamentos:', fetchError);
            return NextResponse.json(
                { error: 'Erro ao buscar agendamentos da fila' },
                { status: 500 }
            );
        }

        // Filtrar apenas os que não estão sendo atendidos
        const naFila = agendamentos.filter((a: any) => !a.atendente_atual_id);

        if (naFila.length === 0) {
            return NextResponse.json(
                { error: 'Não há agendamentos na fila' },
                { status: 404 }
            );
        }

        // Separar preferenciais e normais
        const preferenciais = naFila.filter((a: any) => a.atendimento_preferencial);
        const normais = naFila.filter((a: any) => !a.atendimento_preferencial);

        // Lógica de Prioridade Estrita: Sempre chamar preferencial se houver
        let proximoAgendamento = null;

        if (preferenciais.length > 0) {
            proximoAgendamento = preferenciais[0];
        } else if (normais.length > 0) {
            proximoAgendamento = normais[0];
        }

        if (!proximoAgendamento) {
            return NextResponse.json(
                { error: 'Não foi possível determinar o próximo agendamento' },
                { status: 500 }
            );
        }

        // Atualizar o agendamento com os dados do atendente (Optimistic Locking)
        // Garante que ninguém pegou o agendamento entre o SELECT e o UPDATE
        const { data: agendamentoAtualizado, error: updateError } = await supabase
            .from('agendamentos')
            .update({
                atendente_atual_id: userId,
                atendente_atual_nome: userName,
                data_hora_chamada: new Date().toISOString()
            })
            .eq('id', proximoAgendamento.id)
            .is('atendente_atual_id', null) // Concurrency check
            .select()
            .single();

        if (updateError) {
            console.error('Erro ao atualizar agendamento:', updateError);
            return NextResponse.json(
                { error: 'Erro ao chamar agendamento' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            agendamento: agendamentoAtualizado,
            tipo: proximoAgendamento.atendimento_preferencial ? 'preferencial' : 'normal',
            posicaoAnterior: naFila.findIndex((a: any) => a.id === proximoAgendamento.id) + 1,
            totalNaFila: naFila.length - 1
        }, { status: 200 });
    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
