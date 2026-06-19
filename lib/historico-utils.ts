import { supabase } from './supabase-client';

export type AcaoHistorico =
    | 'criacao'
    | 'atualizacao_cin'
    | 'entrega_cin'
    | 'atualizacao_status'
    | 'coleta_biometrica';

interface RegistrarHistoricoParams {
    atendimento_id: number;
    acao: AcaoHistorico;
    atendente_id?: string;
    atendente_nome?: string;
    detalhes?: Record<string, any>;
}

export async function registrarHistorico(params: RegistrarHistoricoParams): Promise<void> {
    try {
        const { error } = await supabase.from('atendimento_historico').insert({
            atendimento_id: params.atendimento_id,
            acao: params.acao,
            atendente_id: params.atendente_id ?? null,
            atendente_nome: params.atendente_nome ?? null,
            detalhes: params.detalhes ?? null,
        });
        if (error) console.error('[historico] Erro ao registrar:', error.message);
    } catch (err) {
        console.error('[historico] Exceção ao registrar:', err);
    }
}
