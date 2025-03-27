import { Resend } from '@resend/resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  nome: string,
  horario: string,
  diaAtual: string
) {
  try {
    await resend.emails.send({
      from: 'Gestão App <onboarding@resend.dev>', // Substitua pelo seu domínio verificado no Resend
      to,
      subject: 'Confirmação de Atendimento',
      html: `
        <h1>Confirmação de Atendimento</h1>
        <p>Olá, ${nome}!</p>
        <p>Seu atendimento foi agendado com sucesso.</p>
        <p><strong>Data:</strong> ${diaAtual}</p>
        <p><strong>Horário:</strong> ${horario}</p>
        <p>Estamos ansiosos para atendê-lo!</p>
        <p>Atenciosamente,<br>Equipe Gestão App</p>
      `,
    });
    console.log('E-mail enviado com sucesso para', to);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    throw new Error('Falha ao enviar e-mail');
  }
}