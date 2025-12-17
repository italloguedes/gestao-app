-- Drop redundant index on atendimento_observacoes_historico table
-- Keeping idx_observacoes_atendimento_id and releasing idx_observacoes_atendimento

DROP INDEX IF EXISTS idx_observacoes_atendimento;
