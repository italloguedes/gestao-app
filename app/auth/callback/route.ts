import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  console.log('[Auth Callback] Iniciando processamento, origin:', origin);

  if (code) {
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('[Auth Callback] Erro ao trocar código:', sessionError);
        return NextResponse.redirect(new URL('/agendamento', origin));
      }

      if (session?.user) {
        console.log('[Auth Callback] Usuário autenticado:', session.user.email);

        let userRole: string | null = null;

        // 1. Tenta buscar role na tabela users via auth_id
        const { data: userDataById, error: errorById } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', session.user.id)
          .single();

        if (!errorById && userDataById?.role) {
          userRole = userDataById.role;
          console.log('[Auth Callback] Role encontrada por auth_id:', userRole);
        }

        // 2. Fallback: buscar por email se não encontrou por auth_id
        if (!userRole && session.user.email) {
          const { data: userDataByEmail, error: errorByEmail } = await supabase
            .from('users')
            .select('role')
            .eq('email', session.user.email)
            .single();

          if (!errorByEmail && userDataByEmail?.role) {
            userRole = userDataByEmail.role;
            console.log('[Auth Callback] Role encontrada por email:', userRole);
          }
        }

        // 3. Fallback: user_metadata
        if (!userRole) {
          userRole = session.user.user_metadata?.role;
          console.log('[Auth Callback] Role do user_metadata:', userRole);
        }

        // 4. Default
        if (!userRole) {
          userRole = 'user';
          console.log('[Auth Callback] Role padrão aplicada: user');
        }

        console.log('[Auth Callback] Role final:', userRole);

        // Redirecionar baseado na role
        if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'atendente') {
          console.log('[Auth Callback] Redirecionando para /dashboard');
          return NextResponse.redirect(new URL('/dashboard', origin));
        } else if (userRole === 'recepcao') {
          console.log('[Auth Callback] Redirecionando para /admin/agendamentos/hoje');
          return NextResponse.redirect(new URL('/admin/agendamentos/hoje', origin));
        } else {
          console.log('[Auth Callback] Redirecionando para /agendamento');
          return NextResponse.redirect(new URL('/agendamento', origin));
        }
      }
    } catch (error) {
      console.error('[Auth Callback] Erro geral:', error);
    }
  }

  // Fallback em caso de erro
  console.log('[Auth Callback] Sem código ou erro, redirecionando para /agendamento');
  return NextResponse.redirect(new URL('/agendamento', origin));
}
