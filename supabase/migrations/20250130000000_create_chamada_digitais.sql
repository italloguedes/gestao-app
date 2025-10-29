-- Create chamada_digitais table for managing digital collection queue
CREATE TABLE IF NOT EXISTS chamada_digitais (
  id BIGSERIAL PRIMARY KEY,
  atendimento_id BIGINT NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  agendamento_id BIGINT REFERENCES agendamentos(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14),
  status VARCHAR(20) DEFAULT 'chamado' CHECK (status IN ('chamado', 'coletando', 'coletado', 'ausente', 'reagendado')),
  atendente_id UUID,
  atendente_nome VARCHAR(255),
  data_hora_chamada TIMESTAMPTZ DEFAULT NOW(),
  data_hora_coleta TIMESTAMPTZ,
  preferencial BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  tentativas_chamada INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chamada_digitais_atendimento_id ON chamada_digitais(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_chamada_digitais_status ON chamada_digitais(status);
CREATE INDEX IF NOT EXISTS idx_chamada_digitais_data_hora_chamada ON chamada_digitais(data_hora_chamada DESC);
CREATE INDEX IF NOT EXISTS idx_chamada_digitais_preferencial ON chamada_digitais(preferencial);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chamada_digitais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chamada_digitais_updated_at
BEFORE UPDATE ON chamada_digitais
FOR EACH ROW
EXECUTE FUNCTION update_chamada_digitais_updated_at();

-- Add comments to columns
COMMENT ON TABLE chamada_digitais IS 'Registro de chamadas para coleta de digitais';
COMMENT ON COLUMN chamada_digitais.status IS 'Status da chamada: chamado, coletando, coletado, ausente, reagendado';
COMMENT ON COLUMN chamada_digitais.preferencial IS 'Indica se é atendimento preferencial (prioridade na fila)';
COMMENT ON COLUMN chamada_digitais.tentativas_chamada IS 'Número de vezes que a pessoa foi chamada';
