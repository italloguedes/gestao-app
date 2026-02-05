-- Add 'nome' column to links_agendamento
ALTER TABLE links_agendamento ADD COLUMN IF NOT EXISTS nome TEXT;
