-- Script para criar a tabela de histórico de observações
-- Execute este script no seu painel do Supabase (SQL Editor)

-- Criar tabela de histórico de observações
CREATE TABLE IF NOT EXISTS atendimento_observacoes_historico (
  id SERIAL PRIMARY KEY,
  atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  observacao TEXT NOT NULL,
  usuario_email VARCHAR(255),
  usuario_nome VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_observacoes_atendimento ON atendimento_observacoes_historico(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_observacoes_created_at ON atendimento_observacoes_historico(created_at DESC);

-- Habilitar Row Level Security
ALTER TABLE atendimento_observacoes_historico ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
DROP POLICY IF EXISTS "Permitir leitura de observações para usuários autenticados" ON atendimento_observacoes_historico;
CREATE POLICY "Permitir leitura de observações para usuários autenticados"
  ON atendimento_observacoes_historico
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserção para usuários autenticados
DROP POLICY IF EXISTS "Permitir inserção de observações para usuários autenticados" ON atendimento_observacoes_historico;
CREATE POLICY "Permitir inserção de observações para usuários autenticados"
  ON atendimento_observacoes_historico
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comentários na tabela
COMMENT ON TABLE atendimento_observacoes_historico IS 'Histórico de todas as observações adicionadas aos atendimentos';
COMMENT ON COLUMN atendimento_observacoes_historico.atendimento_id IS 'ID do atendimento relacionado';
COMMENT ON COLUMN atendimento_observacoes_historico.observacao IS 'Texto da observação';
COMMENT ON COLUMN atendimento_observacoes_historico.usuario_email IS 'Email do usuário que adicionou a observação';
COMMENT ON COLUMN atendimento_observacoes_historico.usuario_nome IS 'Nome do usuário que adicionou a observação';
COMMENT ON COLUMN atendimento_observacoes_historico.created_at IS 'Data e hora da criação da observação';
