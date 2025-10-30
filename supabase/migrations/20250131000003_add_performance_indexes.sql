-- Add performance indexes for chamada_digitais table
-- These indexes optimize frequent queries used in the digital collection queue

-- Index for filtering by status (used in loadFila to find active calls)
CREATE INDEX IF NOT EXISTS idx_chamada_digitais_status
ON chamada_digitais (status);

-- Index for filtering by agendamento_id and status (used in chamarPessoa verification)
CREATE INDEX IF NOT EXISTS idx_chamada_digitais_agendamento_status
ON chamada_digitais (agendamento_id, status);

-- Index for filtering by date (useful for reporting and daily queries)
CREATE INDEX IF NOT EXISTS idx_chamada_digitais_data_hora
ON chamada_digitais (data_hora_chamada DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_chamada_digitais_status IS
'Optimizes queries filtering by call status (chamado, coletando, coletado, ausente, reagendado)';

COMMENT ON INDEX idx_chamada_digitais_agendamento_status IS
'Optimizes queries checking if a specific agendamento has active calls';

COMMENT ON INDEX idx_chamada_digitais_data_hora IS
'Optimizes queries ordering by call date/time, useful for reports';
