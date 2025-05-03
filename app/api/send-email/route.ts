import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    // Configurar o transporter do nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    // Configurar o email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      html,
    };

    // Enviar o email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao enviar email' },
      { status: 500 }
    );
  }
}