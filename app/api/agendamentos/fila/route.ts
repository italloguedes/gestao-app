import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

/**
 * GET /api/agendamentos/fila
 * Retorna estatísticas da fila de agendamentos
 */
export async function GET(request: NextRequest) {
    // Verificar autenticação e permissões
    const authCheck = await checkAuth(request, 'atendente');

    if (!authCheck.authenticated) {
        return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
        return forbiddenResponse(authCheck.error || 'Apenas atendentes e administradores podem acessar a fila');
    }

    try {
        const hoje = new Date().toISOString().split('T')[0];

        // Buscar todos os agendamentos confirmados de hoje
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select('id, atendimento_preferencial, atendente_atual_id, data_hora_chamada')
            .eq('data', hoje)
            .eq('status', 'confirmado')
            .order('horario', { ascending: true });

        if (error) {
            console.error('Erro ao buscar agendamentos:', error);
            return NextResponse.json(
                { error: 'Erro ao buscar agendamentos da fila' },
                { status: 500 }
            );
        }

        // Filtrar apenas os que não estão sendo atendidos
        const naFila = agendamentos.filter((a: any) => !a.atendente_atual_id);

        // Contar preferenciais e normais na fila
        const preferenciais = naFila.filter((a: any) => a.atendimento_preferencial).length;
        const normais = naFila.filter((a: any) => !a.atendimento_preferencial).length;

        // Contar quantos já foram chamados hoje (para determinar próximo tipo)
        const chamadosHoje = agendamentos.filter((a: any) => a.data_hora_chamada);
        const preferenciaisChamados = chamadosHoje.filter((a: any) => a.atendimento_preferencial).length;
        const normaisChamados = chamadosHoje.filter((a: any) => !a.atendimento_preferencial).length;

        // Determinar próximo tipo a ser chamado
        let proximoTipo: 'preferencial' | 'normal' | null = null;

        if (preferenciais > 0 && normais > 0) {
            // Se há ambos tipos, alternar: 1 pref, 1 normal
            // Se o último chamado foi normal (ou nenhum foi chamado), chamar preferencial
            if (normaisChamados > preferenciaisChamados) {
                proximoTipo = 'preferencial';
            } else {
                proximoTipo = 'normal';
            }
        } else if (preferenciais > 0) {
            proximoTipo = 'preferencial';
        } else if (normais > 0) {
            proximoTipo = 'normal';
        }

        return NextResponse.json({
            total: naFila.length,
            preferenciais,
            normais,
            proximoTipo,
            totalChamadosHoje: chamadosHoje.length,
            preferenciaisChamados,
            normaisChamados
        });
    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
