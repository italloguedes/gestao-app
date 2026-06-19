import { supabase } from './supabase-client';

export interface RegistrarLogParams {
  action: string;
  entity_type: string;
  description: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
}

/**
 * Registra um log de atividade no Supabase.
 * Pode ser chamado no cliente ou servidor.
 */
export async function registrarLog(params: RegistrarLogParams): Promise<void> {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      action: params.action,
      entity_type: params.entity_type,
      description: params.description,
      user_id: params.user_id ?? null,
      user_email: params.user_email ?? null,
      user_role: params.user_role ?? null,
    });

    if (error) {
      console.error('[activity-log] Erro ao registrar log:', error.message);
    }
  } catch (err) {
    console.error('[activity-log] Exceção ao registrar log:', err);
  }
}
