import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Erro ao trocar código por sessão:', sessionError);
      return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
    }

    if (session?.user) {
      // Armazena o timestamp de quando a sessão deve expirar (2 horas)
      const expiryTimestamp = Date.now() + 7200000; // 2 horas em milissegundos

      // Busca o usuário no banco de dados
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', session.user.email)
        .single();

      // Se o usuário não existe, cria um novo com role 'user'
      if (error && error.code === 'PGRST116') {
        await supabase
          .from('users')
          .insert({
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
            role: 'user',
            status: 'active',
          });
      }

      // Redireciona baseado na role
      if (userData?.role === 'admin' || userData?.role === 'atendente') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // Para outros usuários ou em caso de erro, redireciona para o agendamento
  return NextResponse.redirect(new URL('/agendamento', request.url));
} 
