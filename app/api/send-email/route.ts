import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

export async function POST(request: NextRequest) {
  // Verificar autenticação e permissões (requer atendente, admin ou superadmin)
  const authCheck = await checkAuth(request, 'atendente');

  if (!authCheck.authenticated) {
    return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
  }

  if (!authCheck.authorized) {
    return forbiddenResponse(authCheck.error || 'Apenas atendentes e administradores podem enviar emails');
  }

  try {
    const { to, subject, html, attachments: rawAttachments } = await request.json();

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587, // STARTTLS
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
      tls: {
        ciphers: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
      greetingTimeout: 10000,
    });

    // Fail fast if connection cannot be established
    await transporter.verify();

    // Fallback em texto puro, removendo tags do HTML
    const plainText = html.replace(/<[^>]*>/g, '');

    // Processar attachments se existirem
    const processedAttachments = rawAttachments?.map((a: { filename: string; content: string; contentType: string }) => ({
      filename: a.filename,
      content: Buffer.from(a.content, 'base64'),
      contentType: a.contentType,
    }));

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
      ...(processedAttachments?.length ? { attachments: processedAttachments } : {}),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);

    return NextResponse.json({ success: true, messageId: info.messageId });
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
        error: isDev ? `Falha ao enviar email: ${err?.message ?? 'erro desconhecido'}` : 'Falha ao enviar email',
        code: isDev ? err?.code : undefined,
      },
      { status: 500 }
    );
  }
}
