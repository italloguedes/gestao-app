import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendEmail';

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
              <img src="https://via.placeholder.com/150x50?text=Logo" alt="Logo" style="max-width: 150px;" />
            </div>
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #333333; font-size: 24px; margin-bottom: 20px; text-align: center;">Atendimento Realizado, ${nome}! 🎉</h1>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Olá, ${nome}! Seu atendimento foi realizado com sucesso. O prazo para retirada é de 20 dias.
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                <strong>CPF:</strong> ${cpf}<br/>
                <strong>Número de Protocolo:</strong> ${protocolo}
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dirija-se ao nosso ponto de atendimento com um documento de identificação com foto.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://seusite.com/localizacao" style="background-color: #4CAF50; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                  Ver Local de Retirada
                </a>
              </div>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dúvidas? Entre em contato: <a href="mailto:suporte@seusite.com" style="color: #4CAF50; text-decoration: none;">suporte@seusite.com</a> ou (XX) XXXX-XXXX.
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                Estamos ansiosos para atendê-lo(a)!
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #999999; font-size: 14px;">© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
            </div>
          </div>
        `;

        await sendEmail(to, 'Confirmação de Atendimento', emailHtml);
      } else {
        // Template para cadastrar-cin (quando protocolo não está presente)
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://via.placeholder.com/150x50?text=Logo" alt="Logo" style="max-width: 150px;" />
            </div>
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #333333; font-size: 24px; margin-bottom: 20px; text-align: center;">Sua Carteira Está Pronta, ${nome}! 🎉</h1>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Olá, ${nome}! Sua Carteira de Identificação Nacional (CIN) associada ao CPF <strong>${cpf}</strong> está pronta para retirada.
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dirija-se ao nosso ponto de atendimento com um documento de identificação com foto.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://seusite.com/localizacao" style="background-color: #4CAF50; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                  Ver Local de Retirada
                </a>
              </div>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dúvidas? Entre em contato: <a href="mailto:suporte@seusite.com" style="color: #4CAF50; text-decoration: none;">suporte@seusite.com</a> ou (XX) XXXX-XXXX.
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                Estamos ansiosos para atendê-lo(a)!
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #999999; font-size: 14px;">© 2025 Gestão de Atendimentos. Todos os direitos reservados.</p>
            </div>
          </div>
        `;

        await sendEmail(to, 'Sua Carteira de Identificação Nacional Está Pronta!', emailHtml);
      }

      return NextResponse.json({ message: 'E-mail enviado com sucesso' }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Parâmetros inválidos: forneça "text" ou "nome" e "cpf"' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao enviar e-mail: ' + (error as Error).message }, { status: 500 });
  }
}