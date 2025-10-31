-- Add unique constraint to prevent duplicate active calls
-- This ensures only ONE active call (status 'chamado' or 'coletando') exists per atendimento
-- Multiple completed calls (status 'coletado', 'ausente', 'reagendado') are allowed

-- Create partial unique index for active calls
CREATE UNIQUE INDEX IF NOT EXISTS idx_chamada_digitais_active_unique
ON chamada_digitais (atendimento_id)
WHERE status IN ('chamado', 'coletando');

-- Add comment for documentation
COMMENT ON INDEX idx_chamada_digitais_active_unique IS
'Prevents race condition: ensures only one active call per atendimento. Allows multiple completed calls (coletado, ausente, reagendado).';
