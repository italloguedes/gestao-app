import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendEmail';

interface EmailError extends Error {
  message: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject = 'Confirmação de Atendimento', text, nome, cpf, protocolo } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Parâmetro "to" é obrigatório' },
        { status: 400 }
      );
    }

    // Caso 1: Envio de e-mail em texto simples (mantido para compatibilidade, mas não será usado)
    if (text) {
      await sendEmail(to, subject, text);
      return NextResponse.json({ message: 'E-mail enviado com sucesso' }, { status: 200 });
    }

    // Caso 2: Envio de e-mail HTML estilizado (usado por cadastrar-cin e cadastrar-atendimento)
    if (nome && cpf) {
      // Template para cadastrar-atendimento (quando protocolo está presente)
      if (protocolo) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://alece.ce.gov.br/wp-content/uploads/2023/04/logo-alece-horizontal.png" alt="Logo ALECE" style="max-width: 150px;" />
            </div>
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #333333; font-size: 24px; margin-bottom: 20px; text-align: center;">Atendimento Realizado, ${nome}! 🎉</h1>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Olá, ${nome}! Seu atendimento foi realizado com sucesso. O prazo para retirada é de 20 dias.
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                <strong>Nome:</strong> ${nome}<br/>
                <strong>CPF:</strong> ${cpf}<br/>
                <strong>Número de Protocolo:</strong> ${protocolo}
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Para dúvidas, entre em contato pelo telefone (85) 2180-6587.
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #999999; font-size: 14px;">© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
            </div>
          </div>
        `;

        try {
          await sendEmail(to, 'Confirmação de Atendimento', emailHtml);
          return NextResponse.json({ message: 'E-mail enviado com sucesso' }, { status: 200 });
        } catch (emailError) {
          const error = emailError as EmailError;
          console.error('Erro detalhado ao enviar e-mail:', error);
          return NextResponse.json(
            { error: `Erro ao enviar e-mail: ${error.message}` },
            { status: 500 }
          );
        }
      } else {
        // Template para cadastrar-cin (quando protocolo não está presente)
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://alece.ce.gov.br/wp-content/uploads/2023/04/logo-alece-horizontal.png" alt="Logo ALECE" style="max-width: 150px;" />
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
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #999999; font-size: 14px;">© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
            </div>
          </div>
        `;

        try {
          await sendEmail(to, 'Sua Carteira de Identificação Nacional Está Pronta!', emailHtml);
          return NextResponse.json({ message: 'E-mail enviado com sucesso' }, { status: 200 });
        } catch (emailError) {
          const error = emailError as EmailError;
          console.error('Erro detalhado ao enviar e-mail:', error);
          return NextResponse.json(
            { error: `Erro ao enviar e-mail: ${error.message}` },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: 'Parâmetros inválidos: forneça "text" ou "nome" e "cpf"' },
      { status: 400 }
    );
  } catch (error) {
    const err = error as EmailError;
    console.error('Erro na rota de envio de e-mail:', err);
    return NextResponse.json(
      { error: `Erro ao processar requisição: ${err.message}` },
      { status: 500 }
    );
  }
}