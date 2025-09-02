import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Agendamento {
  id: number;
  nome: string;
  email: string;
  data: string;
  horario: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
  status: string;
}

export async function sendEmailConfirmation(agendamento: Agendamento) {
  try {
    console.log('Iniciando envio de email para:', agendamento.email);
    
    const subject = 'Confirmação de Agendamento - Sala Sensorial ALECE';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #047857;">Confirmação de Agendamento</h2>
        <p>Olá ${agendamento.nome},</p>
        <p>Seu agendamento foi confirmado com sucesso!</p>
        
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #047857; margin-top: 0;">Detalhes do Agendamento:</h3>
          <p><strong>Local:</strong> Prédio da Assembleia Legislativa Anexo III, Sala Sensorial</p>
          <p><strong>Endereço:</strong> Av. Pontes Vieira, 2300 - São João do Tauape, Fortaleza - CE, 60135-238</p>
          <p><strong>Data:</strong> ${new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p><strong>Horário:</strong> ${agendamento.horario}</p>
        </div>

        <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">Documentos Necessários:</h3>
          <ul>
            <li>CPF</li>
            <li>Endereço com CEP válido</li>
            <li>Número de telefone</li>
            <li>Certidão conforme o estado civil</li>
          </ul>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">Importante:</h3>
          <p>O agendamento é exclusivo para pessoas autistas, com síndrome de Down e TDAH.</p>
          <p>Chegue com 15 minutos de antecedência.</p>
          <p>Traga todos os documentos originais e legíveis.</p>
        </div>

        <p>Em caso de dúvidas, entre em contato pelo telefone: (85) 3101-XXXX</p>
        
        <p>Atenciosamente,<br>Equipe Sala Sensorial ALECE</p>
      </div>
    `;

    // Usar a função do Supabase diretamente em vez de fetch para API interna
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: agendamento.email,
        subject,
        html,
      }
    });

    if (error) {
      throw new Error(`Erro ao enviar email: ${error.message}`);
    }

    console.log('Email enviado com sucesso para:', agendamento.email);
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
}

export async function sendReminderEmail(agendamento: Agendamento) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: agendamento.email,
      subject: 'Lembrete de Agendamento - Sala Sensorial ALECE',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #047857;">Lembrete de Agendamento</h2>
          <p>Olá ${agendamento.nome},</p>
          <p>Este é um lembrete do seu agendamento para amanhã!</p>
          
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #047857; margin-top: 0;">Detalhes do Agendamento:</h3>
            <p><strong>Data:</strong> ${new Date(agendamento.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p><strong>Horário:</strong> ${agendamento.horario}</p>
            <p><strong>Local:</strong> Sala Sensorial / ALECE</p>
          </div>

          <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Documentos Necessários:</h3>
            <ul>
              <li>CPF</li>
              <li>Endereço com CEP válido</li>
              <li>Número de telefone</li>
              <li>Certidão conforme o estado civil</li>
            </ul>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">Importante:</h3>
            <p>Não se esqueça de trazer todos os documentos originais e legíveis.</p>
            <p>Chegue com 15 minutos de antecedência.</p>
            <p>Em caso de impossibilidade de comparecimento, cancele o agendamento com antecedência.</p>
          </div>

          <p>Em caso de dúvidas, entre em contato pelo telefone: (85)2180-6587.</p>
          
          <p>Atenciosamente,<br>Equipe Sala Sensorial ALECE</p>
        </div>
      `
    }
  });

  if (error) {
    console.error('Erro ao enviar email de lembrete:', error);
    throw error;
  }

  return data;
}

export async function sendInstructionsEmail(agendamento: Agendamento) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: agendamento.email,
      subject: 'Instruções para o Atendimento - Sala Sensorial ALECE',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #047857;">Instruções para o Atendimento</h2>
          <p>Olá ${agendamento.nome},</p>
          <p>Seu atendimento está agendado para hoje!</p>
          
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #047857; margin-top: 0;">Detalhes do Atendimento:</h3>
            <p><strong>Data:</strong> Hoje</p>
            <p><strong>Horário:</strong> ${agendamento.horario}</p>
            <p><strong>Local:</strong> Sala Sensorial / ALECE</p>
          </div>

          <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Documentos Necessários:</h3>
            <ul>
              <li>CPF</li>
              <li>Endereço com CEP válido</li>
              <li>Número de telefone</li>
              <li>Certidão conforme o estado civil</li>
            </ul>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">Instruções Importantes:</h3>
            <p>1. Chegue com 15 minutos de antecedência</p>
            <p>2. Traga todos os documentos originais e legíveis</p>
            <p>3. Apresente o comprovante de agendamento (impresso ou no celular)</p>
            <p>4. Em caso de atraso, sua senha poderá ser cancelada</p>
          </div>

          <p>Em caso de dúvidas, entre em contato pelo telefone: (85) 3101-XXXX</p>
          
          <p>Atenciosamente,<br>Equipe Sala Sensorial ALECE</p>
        </div>
      `
    }
  });

  if (error) {
    console.error('Erro ao enviar email de instruções:', error);
    throw error;
  }

  return data;
} 
