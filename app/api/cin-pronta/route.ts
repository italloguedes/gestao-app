// app/api/cin-pronta/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, nome, cpf } = await request.json();

    // Verificando se todos os parâmetros necessários estão presentes
    if (!to || !nome || !cpf) {
      return NextResponse.json(
        { success: false, error: 'Dados incompletos para envio de email' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    // Corpo do e-mail com HTML formatado
    const htmlContent = `
      <p>Olá, ${nome}! Sua Carteira de Identificação Nacional (CIN) associada ao CPF ${cpf} está pronta para retirada.</p>
      <p><strong>Local de retirada:</strong> Prédio da Assembleia Legislativa Anexo III, Sala Sensorial.<br>
      <strong>Endereço:</strong> Av. Pontes Vieira, 2300 - São João do Tauape, Fortaleza - CE, 60135-238.<br>
      <strong>Horário:</strong> 08h às 11:30 e 13h às 16h.</p>
      <p>Para dúvidas, entre em contato pelo telefone (85) 2180-6587.</p>
      <p>Retiradas por terceiros podem ser feitas por parentes de 1º ou 2º grau (pai, mãe, filho, irmãos, tios ou avós) mediante apresentação de documento original com foto e certidão de nascimento ou casamento do titular.</p>
      <p><a href="https://www.gov.br/">Acessar gov.br</a></p>
      <p>© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
    `;

    const mailOptions = {
      from: `"Atendimento realizado com sucesso!" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Sua CIN está pronta para retirada!`,
      text: `Olá, ${nome}! Sua CIN está pronta para retirada. CPF: ${cpf}`,
      html: htmlContent,
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
