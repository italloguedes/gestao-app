-- Add fotos_coletadas column to atendimentos table
-- Migration: 20250101000000_add_fotos_coletadas_column

-- Add the column if it doesn't exist
ALTER TABLE atendimentos 
ADD COLUMN IF NOT EXISTS fotos_coletadas BOOLEAN DEFAULT FALSE;

-- Add comment to the column for documentation
COMMENT ON COLUMN atendimentos.fotos_coletadas IS 'Indica se as fotos biométricas do atendimento foram coletadas';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_atendimentos_fotos_coletadas 
ON atendimentos(fotos_coletadas);

