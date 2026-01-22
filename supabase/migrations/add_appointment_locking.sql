-- Migration: Add appointment locking fields
-- Description: Adds fields to track which attendant is currently serving an appointment
-- Created: 2026-11-26

-- Add new columns to agendamentos table
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS atendente_atual_id UUID,
ADD COLUMN IF NOT EXISTS atendente_atual_nome TEXT,
ADD COLUMN IF NOT EXISTS horario_inicio_atendimento TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_atendente_atual 
ON agendamentos(atendente_atual_id) 
WHERE atendente_atual_id IS NOT NULL;

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN agendamentos.atendente_atual_id IS 'ID do atendente que está realizando o atendimento no momento';
COMMENT ON COLUMN agendamentos.atendente_atual_nome IS 'Nome do atendente para exibição na interface';
COMMENT ON COLUMN agendamentos.horario_inicio_atendimento IS 'Timestamp de quando o atendimento foi iniciado';
