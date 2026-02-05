import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  console.log('[Auth Callback] Iniciando, origin:', origin);

  if (code) {
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('[Auth Callback] Erro ao trocar código:', sessionError);
        return NextResponse.redirect(new URL('/agendamento', origin));
      }

      if (session?.user) {
        // Usa APENAS user_metadata.role do Supabase Auth
        const userRole = session.user.user_metadata?.role || 'user';

        console.log('[Auth Callback] Email:', session.user.email);
        console.log('[Auth Callback] Role (user_metadata):', userRole);

        // Redirecionar baseado na role
        if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'atendente') {
          console.log('[Auth Callback] Redirecionando para /dashboard');
          return NextResponse.redirect(new URL('/dashboard', origin));
        } else if (userRole === 'recepcao') {
          console.log('[Auth Callback] Redirecionando para /admin/agendamentos/hoje');
          return NextResponse.redirect(new URL('/admin/agendamentos/hoje', origin));
        } else {
          console.log('[Auth Callback] Redirecionando para /agendamento (role:', userRole, ')');
          return NextResponse.redirect(new URL('/agendamento', origin));
        }
      }
    } catch (error) {
      console.error('[Auth Callback] Erro geral:', error);
    }
  }

  console.log('[Auth Callback] Fallback - redirecionando para /agendamento');
  return NextResponse.redirect(new URL('/agendamento', origin));
}
