import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

/**
 * API Route para listar usuários do Supabase Auth
 * Requer autenticação e role: superadmin
 * Requer service_role key (admin) para acessar auth.admin.listUsers()
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const authCheck = await checkAuth(request, 'superadmin');

    if (!authCheck.authenticated) {
      return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
    }

    if (!authCheck.authorized) {
      return forbiddenResponse(authCheck.error || 'Apenas super administradores podem listar usuários');
    }
    // Verificar se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variáveis de ambiente não configuradas:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta. Verifique as variáveis de ambiente.' },
        { status: 500 }
      );
    }

    // Criar cliente Supabase com service_role key (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Buscar todos os usuários do Auth com paginação automática
    // O listUsers() retorna até 1000 usuários por padrão, então precisamos buscar em páginas
    console.log('=== BUSCA DE USUÁRIOS DO AUTH ===');
    let allAuthUsers: any[] = [];
    let page = 1;
    const perPage = 1000; // Limite máximo por página
    let hasMore = true;
    let lastPageUsers = 0;

    while (hasMore) {
      try {
        // listUsers() aceita page e perPage como parâmetros opcionais
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage
        });

        if (authError) {
          // Se for erro de página não encontrada, parar
          if (authError.message?.includes('page') || authError.message?.includes('not found')) {
            console.log(`Página ${page} não encontrada, finalizando busca`);
            hasMore = false;
            break;
          }
          console.error('Erro ao buscar usuários do Auth:', authError);
          return NextResponse.json(
            { error: 'Erro ao buscar usuários do Supabase Auth', details: authError.message },
            { status: 500 }
          );
        }

        // A resposta do listUsers() é um objeto com { users: User[], total?: number }
        const users = authData?.users || [];
        
        if (users && users.length > 0) {
          allAuthUsers = [...allAuthUsers, ...users];
          lastPageUsers = users.length;
          console.log(`Página ${page}: ${users.length} usuários encontrados (Total acumulado: ${allAuthUsers.length})`);
          
          // Se retornou menos que perPage, não há mais registros
          if (users.length < perPage) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          // Se não retornou usuários, não há mais páginas
          hasMore = false;
        }
      } catch (err: any) {
        // Se der erro na paginação (pode ser que a página não exista), parar
        console.warn(`Erro ao buscar página ${page} de usuários do Auth:`, err.message);
        hasMore = false;
      }
    }

    console.log(`Total de usuários do Auth buscados: ${allAuthUsers.length}`);
    if (lastPageUsers === perPage) {
      console.warn('Atenção: Última página retornou o máximo de registros. Pode haver mais usuários não carregados.');
    }
    console.log('==================================');

    // Buscar usuários já vinculados na tabela users (também com paginação)
    console.log('=== BUSCA DE USUÁRIOS VINCULADOS ===');
    let allLinkedUsers: any[] = [];
    let linkedPage = 0;
    const linkedPageSize = 1000;
    let hasMoreLinked = true;

    while (hasMoreLinked) {
      const from = linkedPage * linkedPageSize;
      const to = from + linkedPageSize - 1;

      const { data: existingUsers, error: usersError } = await supabaseAdmin
        .from('users')
        .select('auth_id')
        .not('auth_id', 'is', null)
        .range(from, to);

      if (usersError) {
        console.error('Erro ao buscar usuários vinculados:', usersError);
        return NextResponse.json(
          { error: 'Erro ao buscar usuários vinculados', details: usersError.message },
          { status: 500 }
        );
      }

      if (existingUsers && existingUsers.length > 0) {
        allLinkedUsers = [...allLinkedUsers, ...existingUsers];
        console.log(`Página ${linkedPage + 1} de vinculados: ${existingUsers.length} registros (Total: ${allLinkedUsers.length})`);
        
        if (existingUsers.length < linkedPageSize) {
          hasMoreLinked = false;
        } else {
          linkedPage++;
        }
      } else {
        hasMoreLinked = false;
      }
    }

    console.log(`Total de usuários vinculados: ${allLinkedUsers.length}`);
    console.log('=====================================');

    // Criar Set de auth_ids já vinculados
    const linkedAuthIds = new Set(allLinkedUsers.map(u => u.auth_id));

    // Formatar dados dos usuários do Auth
    const authUsers = allAuthUsers.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      user_metadata: user.user_metadata,
      is_linked: linkedAuthIds.has(user.id)
    }));

    return NextResponse.json({
      users: authUsers,
      total: authUsers.length,
      linked: linkedAuthIds.size,
      available: authUsers.filter(u => !u.is_linked).length
    });

  } catch (error) {
    console.error('Erro inesperado ao listar usuários do Auth:', error);
    return NextResponse.json(
      { error: 'Erro inesperado ao processar requisição' },
      { status: 500 }
    );
  }
}
