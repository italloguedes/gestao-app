import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    try {
      const supabase = createRouteHandlerClient({ cookies });

      // Apenas troca o código por sessão - NÃO faz lógica de role aqui
      // O callback rápido evita "stale session" error
      await supabase.auth.exchangeCodeForSession(code);

      // Redireciona para raiz - o AuthContext vai detectar SIGNED_IN
      // e fazer o redirect baseado na role no client-side
      return NextResponse.redirect(new URL('/', origin));
    } catch (error) {
      console.error('[Auth Callback] Erro:', error);
    }
  }

  // Fallback: sempre vai para raiz, deixa o cliente decidir
  return NextResponse.redirect(new URL('/', origin));
}
