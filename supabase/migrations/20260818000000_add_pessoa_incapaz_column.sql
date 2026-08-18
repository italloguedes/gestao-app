-- Adicionar coluna pessoa_incapaz na tabela atendimentos
-- Indica se a pessoa é incapaz (informação relevante para coleta de digitais)
ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS pessoa_incapaz BOOLEAN DEFAULT FALSE;

-- Comentário descritivo
COMMENT ON COLUMN atendimentos.pessoa_incapaz IS 'Indica se a pessoa é incapaz - informação exibida durante a coleta de digitais';
