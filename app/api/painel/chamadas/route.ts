import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PublicCall = {
  id: number;
  senha: number | null;
  tipo: 'normal' | 'preferencial' | null;
  status: string | null;
  horario_chamada: string | null;
  atendente_nome: string | null;
  atendimento_preferencial: boolean | null;
  nome_publico: string;
};

function maskName(fullName: string | null): string {
  if (!fullName) return 'Cliente';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Cliente';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('agendamentos')
      .select('id, nome, senha, tipo, status, horario_chamada, atendente_nome, atendimento_preferencial')
      .in('status', ['chamando', 'concluido', 'atendendo'])
      .order('horario_chamada', { ascending: false })
      .limit(4);

    if (error) {
      console.error('Erro ao buscar chamadas do painel:', error);
      return NextResponse.json({ error: 'Erro ao carregar chamadas' }, { status: 500 });
    }

    const calls: PublicCall[] = (data || []).map((call: any) => ({
      id: call.id,
      senha: call.senha,
      tipo: call.tipo,
      status: call.status,
      horario_chamada: call.horario_chamada,
      atendente_nome: call.atendente_nome || null,
      atendimento_preferencial: call.atendimento_preferencial || false,
      nome_publico: maskName(call.nome)
    }));

    return NextResponse.json({
      current: calls[0] || null,
      history: calls.slice(1, 4)
    });
  } catch (error) {
    console.error('Erro inesperado no painel:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
