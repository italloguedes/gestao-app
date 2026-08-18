import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ========================================
// API DE CONSULTA DE LOGS DE ATIVIDADES
// GET /api/logs?date=YYYY-MM-DD&user_id=xxx&action=create&entity_type=atendimento&search=texto&page=1&limit=50
// ========================================

let _supabaseAdmin: any = null;
function getSupabaseAdmin(): any {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export async function GET(request: Request) {
  try {
    // Verificar autenticação e autorização
    const authHeader = request.headers.get('authorization');
    let userRole = '';

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      // Verificar se é admin ou superadmin
      const { data: userData } = await getSupabaseAdmin()
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single();

      if (!userData || !['superadmin', 'admin'].includes(userData.role)) {
        return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem visualizar logs.' }, { status: 403 });
      }
      userRole = userData.role;
    } else {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    // Parsear parâmetros de consulta
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const dateEnd = url.searchParams.get('date_end');
    const userId = url.searchParams.get('user_id');
    const action = url.searchParams.get('action');
    const entityType = url.searchParams.get('entity_type');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Construir query
    let query = getSupabaseAdmin()
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filtro por data
    if (date) {
      const startDate = `${date}T00:00:00`;
      const endDateStr = dateEnd || date;
      const endDate = `${endDateStr}T23:59:59`;
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    // Filtro por usuário
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Filtro por ação
    if (action) {
      query = query.eq('action', action);
    }

    // Filtro por tipo de entidade
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    // Busca por texto
    if (search) {
      query = query.ilike('description', `%${search}%`);
    }

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('[api/logs] Erro ao buscar logs:', error);
      return NextResponse.json({ error: 'Erro ao buscar logs' }, { status: 500 });
    }

    // Buscar estatísticas do dia (se filtro de data for "hoje" ou uma data específica)
    let stats = null;
    if (date) {
      const startDate = `${date}T00:00:00`;
      const endDateStr = dateEnd || date;
      const endDate = `${endDateStr}T23:59:59`;

      // Total de ações por tipo
      const { data: actionStats } = await getSupabaseAdmin()
        .from('activity_logs')
        .select('action')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Total de ações por usuário
      const { data: userStats } = await getSupabaseAdmin()
        .from('activity_logs')
        .select('user_name, user_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (actionStats && userStats) {
        // Contar ações por tipo
        const actionCounts: Record<string, number> = {};
        actionStats.forEach((log: any) => {
          actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        });

        // Contar ações por usuário
        const userCounts: Record<string, { name: string; count: number }> = {};
        userStats.forEach((log: any) => {
          const key = log.user_id || 'sistema';
          if (!userCounts[key]) {
            userCounts[key] = { name: log.user_name || 'Sistema', count: 0 };
          }
          userCounts[key].count += 1;
        });

        stats = {
          total: actionStats.length,
          by_action: actionCounts,
          by_user: Object.values(userCounts).sort((a, b) => b.count - a.count),
        };
      }
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      limit,
      total_pages: count ? Math.ceil(count / limit) : 0,
      stats,
    });
  } catch (error) {
    console.error('[api/logs] Erro inesperado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
