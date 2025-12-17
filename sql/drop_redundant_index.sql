-- Drop redundant index on chamada_digitais table
-- Keeping idx_chamada_digitais_data_hora and dropping idx_chamada_digitais_data_hora_chamada

DROP INDEX IF EXISTS idx_chamada_digitais_data_hora_chamada;
