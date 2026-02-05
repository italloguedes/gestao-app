-- Add rejection reason column to pre_agendamentos table
ALTER TABLE pre_agendamentos 
ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;
