import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    // Fallback em texto puro, removendo tags do HTML
    const plainText = html.replace(/<[^>]*>/g, '');

    const mailOptions = {
      from: `"Atendimento realizado com sucesso!! " <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: plainText,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <title>${subject}</title>
          </head>
          <body style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
            ${html}
          </body>
        </html>
      `,
    };

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
