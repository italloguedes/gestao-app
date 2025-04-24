import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, nome, cpf } = await request.json();

    if (!to || !nome || !cpf) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Configuração do Gmail com configurações específicas
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true para 465, false para outras portas
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Template do email estilizado
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/logoautismo.png" alt="Logo Autismo" style="max-width: 150px;" />
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #333333; font-size: 24px; margin-bottom: 20px; text-align: center;">Sua Carteira Está Pronta, ${nome}! 🎉</h1>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Olá, ${nome}! Sua Carteira de Identificação Nacional (CIN) associada ao CPF <strong>${cpf}</strong> está pronta para retirada.
          </p>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            <strong>Local de retirada:</strong> Prédio da Assembleia Legislativa Anexo III, Sala Sensorial.<br/>
            <strong>Endereço:</strong> Av. Pontes Vieira, 2300 - São João do Tauape, Fortaleza - CE, 60135-238.<br/>
            <strong>Horário:</strong> 08h às 11:30 e 13h às 16h.
          </p>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Para dúvidas, entre em contato pelo telefone (85) 2180-6587.
          </p>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Retiradas por terceiros podem ser feitas por parentes de 1º ou 2º grau (pai, mãe, filho, irmãos, tios ou avós) mediante apresentação de documento original com foto e certidão de nascimento ou casamento do titular.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.gov.br" style="background-color: #4CAF50; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
              Acessar gov.br
            </a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #999999; font-size: 14px;">© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
        </div>
      </div>
    `;

    // Configuração do email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: 'Sua Carteira de Identificação Nacional Está Pronta!',
      html: emailContent,
    };

    // Enviar email
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: 'Email enviado com sucesso' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Erro ao enviar email:', error);
    return NextResponse.json(
      { error: 'Falha ao enviar email' },
      { status: 500 }
    );
  }
} 