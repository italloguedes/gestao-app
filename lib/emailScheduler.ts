import { createClient } from '@supabase/supabase-js';
import { sendReminderEmail, sendInstructionsEmail } from './emailService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function scheduleReminderEmails() {
  // Buscar agendamentos para amanhã
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];

  const { data: agendamentosAmanha, error: errorAmanha } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('data', amanhaStr);

  if (errorAmanha) {
    console.error('Erro ao buscar agendamentos para amanhã:', errorAmanha);
    return;
  }

  // Enviar emails de lembrete
  for (const agendamento of agendamentosAmanha || []) {
    try {
      await sendReminderEmail(agendamento);
      console.log(`Email de lembrete enviado para ${agendamento.email}`);
    } catch (error) {
      console.error(`Erro ao enviar email de lembrete para ${agendamento.email}:`, error);
    }
  }

  // Buscar agendamentos para hoje
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];

  const { data: agendamentosHoje, error: errorHoje } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('data', hojeStr);

  if (errorHoje) {
    console.error('Erro ao buscar agendamentos para hoje:', errorHoje);
    return;
  }

  // Enviar emails de instruções
  for (const agendamento of agendamentosHoje || []) {
    try {
      await sendInstructionsEmail(agendamento);
      console.log(`Email de instruções enviado para ${agendamento.email}`);
    } catch (error) {
      console.error(`Erro ao enviar email de instruções para ${agendamento.email}:`, error);
    }
  }
} 