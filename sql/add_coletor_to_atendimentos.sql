-- Add collector tracking columns to atendimentos table
ALTER TABLE atendimentos 
ADD COLUMN IF NOT EXISTS coletor_id TEXT,
ADD COLUMN IF NOT EXISTS coletor_nome TEXT;

-- Create index for performance on reports
CREATE INDEX IF NOT EXISTS idx_atendimentos_coletor_id ON atendimentos(coletor_id);
