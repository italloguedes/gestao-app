import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

/**
 * POST /api/agendamentos/fila/liberar
 * Libera um agendamento que foi chamado mas não foi concluído
 */
export async function POST(request: NextRequest) {
    // Verificar autenticação e permissões
    const authCheck = await checkAuth(request, 'atendente');

    if (!authCheck.authenticated) {
        return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
        return forbiddenResponse(authCheck.error || 'Apenas atendentes e administradores podem liberar agendamentos');
    }

    try {
        const { agendamentoId, userId } = await request.json();

        if (!agendamentoId) {
            return NextResponse.json(
                { error: 'agendamentoId é obrigatório' },
                { status: 400 }
            );
        }

        // Buscar o agendamento
        const { data: agendamento, error: fetchError } = await supabase
            .from('agendamentos')
            .select('*')
            .eq('id', agendamentoId)
            .single();

        if (fetchError) {
            console.error('Erro ao buscar agendamento:', fetchError);
            return NextResponse.json(
                { error: 'Erro ao buscar agendamento' },
                { status: 500 }
            );
        }

        if (!agendamento) {
            return NextResponse.json(
                { error: 'Agendamento não encontrado' },
                { status: 404 }
            );
        }

        // Verificar se o agendamento está sendo atendido pelo usuário atual
        // (permitir admin/superadmin liberar qualquer agendamento)
        if (userId && agendamento.atendente_atual_id !== userId && authCheck.user?.role !== 'admin' && authCheck.user?.role !== 'superadmin') {
            return NextResponse.json(
                { error: 'Você não pode liberar um agendamento que está sendo atendido por outro atendente' },
                { status: 403 }
            );
        }

        // Liberar o agendamento
        const { data: agendamentoLiberado, error: updateError } = await supabase
            .from('agendamentos')
            .update({
                atendente_atual_id: null,
                atendente_atual_nome: null,
                data_hora_chamada: null
            })
            .eq('id', agendamentoId)
            .select()
            .single();

        if (updateError) {
            console.error('Erro ao liberar agendamento:', updateError);
            return NextResponse.json(
                { error: 'Erro ao liberar agendamento' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            agendamento: agendamentoLiberado,
            message: 'Agendamento liberado com sucesso'
        }, { status: 200 });
    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
