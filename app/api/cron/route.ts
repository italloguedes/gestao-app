import { NextResponse } from 'next/server';
import { scheduleReminderEmails } from '@/lib/emailScheduler';

export async function GET() {
  try {
    await scheduleReminderEmails();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao executar agendador de emails:', error);
    return NextResponse.json({ success: false, error: 'Erro ao executar agendador de emails' }, { status: 500 });
  }
} 