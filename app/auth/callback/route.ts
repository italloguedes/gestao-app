import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    if (session?.user) {
      // Primeiro tenta buscar role na tabela users via auth_id
      let userRole = null;

      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', session.user.id)
        .single();

      if (!error && userData?.role) {
        userRole = userData.role;
      }

      // Fallback para user_metadata se não encontrou na tabela
      if (!userRole) {
        userRole = session.user.user_metadata?.role;
      }

      console.log('Auth callback - role detectada:', userRole);

      // Redirecionar baseado na role
      if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'atendente') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else if (userRole === 'recepcao') {
        return NextResponse.redirect(new URL('/admin/agendamentos/hoje', request.url));
      }
    }
  }

  // Para outros usuários ou em caso de erro, redireciona para o agendamento
  return NextResponse.redirect(new URL('/agendamento', request.url));
}
