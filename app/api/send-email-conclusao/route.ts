import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, nome, protocolo } = await request.json();

    // Configuração do transportador de email
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = Number(process.env.EMAIL_PORT) || 587;
    const secure = port === 465; // SSL on 465, STARTTLS on 587
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.EMAIL_USER || process.env.GMAIL_USER,
        pass: process.env.EMAIL_PASSWORD || process.env.GMAIL_PASSWORD,
      },
      tls: {
        ciphers: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
      greetingTimeout: 10000,
    });

    // Falhar rapidamente se conexão não puder ser estabelecida
    await transporter.verify();

    // Template do email
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #008751;">Atendimento Concluído</h2>
        <p>Olá ${nome},</p>
        <p>Seu atendimento com protocolo <strong>${protocolo}</strong> foi concluído com sucesso.</p>
        <p>Agradecemos por utilizar nossos serviços!</p>
        <p>Atenciosamente,<br>Equipe Sala Sensorial - ALECE</p>
      </div>
    `;

    // Enviar o email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Atendimento Concluído - Sala Sensorial ALECE',
      html: emailContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err: any = error;
    console.error('Erro ao enviar email (detalhes):', {
      message: err?.message,
      code: err?.code,
      command: err?.command,
      response: err?.response,
      address: err?.address,
      port: err?.port,
    });
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      {
        success: false,
        error: isDev ? `Erro ao enviar email: ${err?.message ?? 'erro desconhecido'}` : 'Erro ao enviar email',
        code: isDev ? err?.code : undefined,
      },
      { status: 500 }
    );
  }
} 
