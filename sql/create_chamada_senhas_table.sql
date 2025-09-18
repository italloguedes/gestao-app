-- Criar tabela para sistema de chamada de senhas
CREATE TABLE IF NOT EXISTS chamada_senhas (
  id SERIAL PRIMARY KEY,
  agendamento_id INTEGER NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  horario TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'chamada' CHECK (status IN ('chamada', 'atendido', 'ausente')),
  data_chamada DATE NOT NULL DEFAULT CURRENT_DATE,
  atendente_id UUID REFERENCES auth.users(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_chamada_senhas_data_status ON chamada_senhas(data_chamada, status);
CREATE INDEX IF NOT EXISTS idx_chamada_senhas_agendamento ON chamada_senhas(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_chamada_senhas_atendente ON chamada_senhas(atendente_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_chamada_senhas_updated_at 
    BEFORE UPDATE ON chamada_senhas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar status 'chamado' à tabela agendamentos se não existir
DO $$ 
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'agendamentos_status_check'
    ) THEN
        -- Adicionar constraint para incluir 'chamado' no status
        ALTER TABLE agendamentos 
        ADD CONSTRAINT agendamentos_status_check 
        CHECK (status IN ('confirmado', 'cancelado', 'bloqueado', 'concluido', 'ausente', 'chamado'));
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON TABLE chamada_senhas IS 'Sistema de chamada de senhas para agendamentos';
COMMENT ON COLUMN chamada_senhas.agendamento_id IS 'Referência ao agendamento original';
COMMENT ON COLUMN chamada_senhas.nome IS 'Nome da pessoa chamada';
COMMENT ON COLUMN chamada_senhas.horario IS 'Horário do agendamento';
COMMENT ON COLUMN chamada_senhas.status IS 'Status da chamada: chamada, atendido, ausente';
COMMENT ON COLUMN chamada_senhas.data_chamada IS 'Data em que a chamada foi feita';
COMMENT ON COLUMN chamada_senhas.atendente_id IS 'ID do atendente que fez a chamada';
COMMENT ON COLUMN chamada_senhas.observacoes IS 'Observações sobre a chamada';
