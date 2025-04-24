import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, nome, protocolo } = await request.json();

    // Configuração do transportador de email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

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
    console.error('Erro ao enviar email:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    );
  }
} 