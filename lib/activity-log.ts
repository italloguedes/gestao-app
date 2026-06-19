import { supabase } from './supabase-client';

// ========================================
// SISTEMA DE LOG DE ATIVIDADES
// Registra todas as ações do sistema para auditoria
// ========================================

export type LogAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'upload'
  | 'download'
  | 'email'
  | 'generate_report'
  | 'status_change'
  | 'call_next'
  | 'lock'
  | 'unlock'
  | 'toggle';

export type LogEntityType =
  | 'atendimento'
  | 'agendamento'
  | 'user'
  | 'file'
  | 'email'
  | 'report'
  | 'session'
  | 'settings'
  | 'observacao'
  | 'cin'
  | 'biometria';

export interface LogParams {
  action: LogAction;
  entity_type: LogEntityType;
  entity_id?: string | number;
  description: string;
  details?: Record<string, any>;
  module?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

/**
 * Registra uma atividade no log do sistema.
 * 
 * Esta função é "fire-and-forget": não bloqueia a operação principal
 * e falha silenciosamente em caso de erro (apenas loga no console).
 */
export async function registrarLog(params: LogParams): Promise<void> {
  try {
    // Obter dados do usuário logado (se não foram fornecidos manualmente)
    let userId = params.user_id;
    let userName = params.user_name;
    let userEmail = params.user_email;
    let userRole = params.user_role;

    if (!userId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          userEmail = user.email || undefined;
          userName = user.user_metadata?.full_name || user.email?.split('@')[0] || undefined;

          // Tentar buscar a role da tabela users
          if (!userRole) {
            const { data: userData } = await supabase
              .from('users')
              .select('role, name')
              .eq('auth_id', user.id)
              .single();

            if (userData) {
              userRole = userData.role;
              if (userData.name) {
                userName = userData.name;
              }
            }
          }
        }
      } catch {
        console.warn('[activity-log] Não foi possível obter dados do usuário');
      }
    }

    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId || null,
      user_name: userName || null,
      user_email: userEmail || null,
      user_role: userRole || null,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id ? String(params.entity_id) : null,
      description: params.description,
      details: params.details || null,
      module: params.module || null,
    });

    if (error) {
      console.error('[activity-log] Erro ao registrar log:', error.message);
    }
  } catch (err) {
    console.error('[activity-log] Exceção ao registrar log:', err);
  }
}

/**
 * Versão server-side do registrarLog para uso em API routes.
 * Recebe o supabase client do servidor como parâmetro.
 */
export async function registrarLogServer(
  supabaseClient: any,
  params: LogParams,
  request?: Request
): Promise<void> {
  try {
    let ipAddress: string | null = null;
    if (request) {
      ipAddress = request.headers.get('x-forwarded-for')
        || request.headers.get('x-real-ip')
        || null;
    }

    const { error } = await supabaseClient.from('activity_logs').insert({
      user_id: params.user_id || null,
      user_name: params.user_name || null,
      user_email: params.user_email || null,
      user_role: params.user_role || null,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id ? String(params.entity_id) : null,
      description: params.description,
      details: params.details || null,
      ip_address: ipAddress,
      module: params.module || 'api',
    });

    if (error) {
      console.error('[activity-log] Erro ao registrar log (server):', error.message);
    }
  } catch (err) {
    console.error('[activity-log] Exceção ao registrar log (server):', err);
  }
}
