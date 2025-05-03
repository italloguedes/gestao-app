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
      // Busca o usuário no banco de dados
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', session.user.email)
        .single();

      if (!error && userData?.role === 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // Para outros usuários ou em caso de erro, redireciona para o agendamento
  return NextResponse.redirect(new URL('/agendamento', request.url));
} 