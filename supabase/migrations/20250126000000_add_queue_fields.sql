-- Add queue management fields to agendamentos table
-- Migration: 20250126000000_add_queue_fields

-- Add columns for queue management
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS atendente_atual_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS atendente_atual_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS data_hora_chamada TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS posicao_fila INTEGER;

-- Add comments to document the columns
COMMENT ON COLUMN agendamentos.atendente_atual_id IS 'ID do atendente que está atendendo este agendamento';
COMMENT ON COLUMN agendamentos.atendente_atual_nome IS 'Nome do atendente para exibição rápida';
COMMENT ON COLUMN agendamentos.data_hora_chamada IS 'Data e hora em que o agendamento foi chamado da fila';
COMMENT ON COLUMN agendamentos.posicao_fila IS 'Posição na fila (calculada automaticamente)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_atendente_atual 
ON agendamentos(atendente_atual_id) 
WHERE atendente_atual_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_data_status 
ON agendamentos(data, status);

CREATE INDEX IF NOT EXISTS idx_agendamentos_posicao_fila 
ON agendamentos(posicao_fila) 
WHERE posicao_fila IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora_chamada 
ON agendamentos(data_hora_chamada DESC) 
WHERE data_hora_chamada IS NOT NULL;

-- Create index for preferential appointments
CREATE INDEX IF NOT EXISTS idx_agendamentos_preferencial 
ON agendamentos(atendimento_preferencial) 
WHERE atendimento_preferencial = TRUE;
