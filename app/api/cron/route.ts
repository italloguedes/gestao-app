import { NextRequest, NextResponse } from 'next/server';
import { scheduleReminderEmails } from '@/lib/emailScheduler';

export const dynamic = 'force-dynamic';


/**
 * API Route para agendamento de emails via Cron
 * Requer token secreto no header Authorization: Bearer <CRON_SECRET>
 * Configure CRON_SECRET no .env
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar token de autorização do Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET não configurado no ambiente');
      return NextResponse.json(
        { success: false, error: 'Configuração do servidor incompleta' },
        { status: 500 }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token de autorização não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    if (token !== cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Token de autorização inválido' },
        { status: 403 }
      );
    }

    // Token válido - executar agendador
    await scheduleReminderEmails();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao executar agendador de emails:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao executar agendador de emails' },
      { status: 500 }
    );
  }
} 
