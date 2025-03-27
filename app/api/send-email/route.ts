// app/api/send-email/route.ts
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendEmail';

export async function POST(request: Request) {
  try {
    const { to, subject, text } = await request.json();

    if (!to || !subject || !text) {
      return NextResponse.json({ error: 'Faltam parâmetros: to, subject e text são obrigatórios' }, { status: 400 });
    }

    await sendEmail(to, subject, text);
    return NextResponse.json({ message: 'E-mail enviado com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail' }, { status: 500 });
  }
}