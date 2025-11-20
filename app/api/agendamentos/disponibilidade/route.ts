import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

// Definição dos horários fixos
const HORARIOS_MANHA = [
    "08:00", "08:25", "08:50", "09:15", "09:40",
    "10:05", "10:30", "10:55", "11:20", "11:45"
];

const HORARIOS_TARDE = [
    "13:00", "13:40", "14:20", "15:00", "15:40"
];

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const data = searchParams.get('data');

    if (!data) {
        return NextResponse.json(
            { error: 'Data é obrigatória' },
            { status: 400 }
        );
    }

    try {
        // Buscar agendamentos existentes para a data
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select('horario, status')
            .eq('data', data)
            .in('status', ['confirmado', 'bloqueado']);

        if (error) {
            console.error('Erro ao buscar agendamentos:', error);
            return NextResponse.json(
                { error: 'Erro ao verificar disponibilidade' },
                { status: 500 }
            );
        }

        const agendamentosMap = new Set(
            agendamentos?.map(a => a.horario.slice(0, 5)) || []
        );

        // Verificar se é o dia atual para filtrar horários passados
        const hoje = new Date();
        const dataSolicitada = new Date(data + 'T00:00:00');
        const isHoje = hoje.toDateString() === dataSolicitada.toDateString();

        const filtrarHorarios = (horarios: string[]) => {
            return horarios.filter(horario => {
                // Se já estiver agendado, remove
                if (agendamentosMap.has(horario)) return false;

                // Se for hoje, verifica se o horário já passou (com margem de 15 min)
                if (isHoje) {
                    const [hora, minuto] = horario.split(':').map(Number);
                    const dataHorario = new Date(hoje);
                    dataHorario.setHours(hora, minuto, 0, 0);

                    // Adiciona 15 minutos de margem
                    const limite = new Date(Date.now() + 15 * 60000);

                    if (dataHorario < limite) return false;
                }

                return true;
            });
        };

        const disponiveisManha = filtrarHorarios(HORARIOS_MANHA);
        const disponiveisTarde = filtrarHorarios(HORARIOS_TARDE);

        return NextResponse.json({
            manha: disponiveisManha,
            tarde: disponiveisTarde
        });

    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
