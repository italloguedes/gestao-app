import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session: cookieSession } } = await supabase.auth.getSession();

    let sessionUser: any = cookieSession?.user || null;

    // Se não houver sessão por cookie, tenta via Bearer token
    if (!sessionUser) {
      const authCheck = await checkAuth(request, 'atendente');
      if (authCheck.authenticated && authCheck.user) {
        sessionUser = authCheck.user;
      }
    }

    if (!sessionUser) {
      return NextResponse.json({ error: 'Autenticação necessária. Sessão ou token não encontrado.' }, { status: 401 });
    }

    const coletorId = sessionUser.id;
    const coletorNome = sessionUser.user_metadata?.name || sessionUser.user_metadata?.full_name || sessionUser.name || 'Atendente';
    const hoje = getTodayDateString();

    // 1. Tentar executar via chamada atômica RPC (caso exista no banco)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('chamar_proximo_coleta', {
        p_coletor_id: coletorId,
        p_coletor_nome: coletorNome
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        return NextResponse.json({ success: true, data: rpcData[0] });
      }
    } catch (e) {
      // Se a função RPC ainda não estiver criada, cai para o fallback atômico abaixo
    }

    // 2. Fallback Atômico com Re-tentativas (Optimistic Lock Loop)
    // Tenta até 3 vezes caso haja colisão simultânea com outros atendentes
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      // Descobrir qual foi o último tipo chamado no posto hoje
      const { data: ultimosData } = await supabase
        .from('atendimentos')
        .select('atendimento_preferencial, updated_at')
        .eq('dia_atual', hoje)
        .or('status.eq.chamando,fotos_coletadas.eq.true')
        .order('updated_at', { ascending: false })
        .limit(1);

      const ultimoTipo = ultimosData && ultimosData.length > 0
        ? (ultimosData[0].atendimento_preferencial ? 'preferencial' : 'normal')
        : null;

      // Buscar pendentes de coleta
      const { data: pendentes, error: fetchError } = await supabase
        .from('atendimentos')
        .select('id, nome, cpf, email, protocolo, dia_atual, horario, status, fotos_coletadas, atendimento_preferencial')
        .eq('dia_atual', hoje)
        .eq('status', 'em_andamento')
        .eq('fotos_coletadas', false)
        .order('horario', { ascending: true });

      if (fetchError || !pendentes || pendentes.length === 0) {
        return NextResponse.json({ message: 'Nenhuma pessoa aguardando coleta de digitais' }, { status: 404 });
      }

      const preferenciais = pendentes.filter((a: any) => a.atendimento_preferencial === true);
      const normais = pendentes.filter((a: any) => !a.atendimento_preferencial);

      let candidato: any = null;

      if (ultimoTipo === 'preferencial') {
        candidato = normais.length > 0 ? normais[0] : preferenciais[0];
      } else {
        candidato = preferenciais.length > 0 ? preferenciais[0] : normais[0];
      }

      if (!candidato) {
        return NextResponse.json({ message: 'Nenhuma pessoa na fila' }, { status: 404 });
      }

      // Tentar a reserva atômica (Lock condicional)
      // Só atualiza se o status AINDA for 'em_andamento'
      const { data: updatedData, error: updateError } = await supabase
        .from('atendimentos')
        .update({ status: 'chamando' })
        .eq('id', candidato.id)
        .eq('status', 'em_andamento')
        .select('id');

      if (!updateError && updatedData && updatedData.length > 0) {
        // Reserva atômica concluída com sucesso!
        return NextResponse.json({
          success: true,
          data: {
            id: candidato.id,
            nome: candidato.nome,
            cpf: candidato.cpf,
            protocolo: candidato.protocolo || '',
            atendimento_preferencial: candidato.atendimento_preferencial === true,
            status: 'chamando'
          }
        });
      }

      // Se falhou por colisão com outro atendente, o loop tenta novamente na próxima iteração
    }

    return NextResponse.json({ error: 'Fila muito concorrida no momento. Tente novamente em um instante.' }, { status: 409 });

  } catch (error: any) {
    console.error('Erro inesperado ao chamar próximo para coleta:', error);
    return NextResponse.json({ error: 'Erro interno ao processar chamada' }, { status: 500 });
  }
}
