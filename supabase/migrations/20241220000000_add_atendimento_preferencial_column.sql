-- Add atendimento_preferencial column to agendamentos table
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS atendimento_preferencial BOOLEAN DEFAULT FALSE;

-- Add comment to the column
COMMENT ON COLUMN agendamentos.atendimento_preferencial IS 'Indica se o agendamento é para atendimento preferencial';
