-- Criar tabela de histórico de observações dos atendimentos
CREATE TABLE IF NOT EXISTS public.atendimento_observacoes_historico (
  id BIGSERIAL PRIMARY KEY,
  atendimento_id BIGINT NOT NULL,
  observacao TEXT NOT NULL,
  usuario_email VARCHAR(255),
  usuario_nome VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/Fortaleza'::text, now()) NOT NULL,
  CONSTRAINT fk_atendimento
    FOREIGN KEY (atendimento_id)
    REFERENCES public.atendimentos(id)
    ON DELETE CASCADE
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_observacoes_atendimento_id
  ON public.atendimento_observacoes_historico(atendimento_id);

CREATE INDEX IF NOT EXISTS idx_observacoes_created_at
  ON public.atendimento_observacoes_historico(created_at DESC);

-- Adicionar comentários para documentação
COMMENT ON TABLE public.atendimento_observacoes_historico IS 'Histórico de observações adicionadas aos atendimentos';
COMMENT ON COLUMN public.atendimento_observacoes_historico.atendimento_id IS 'ID do atendimento relacionado';
COMMENT ON COLUMN public.atendimento_observacoes_historico.observacao IS 'Texto da observação';
COMMENT ON COLUMN public.atendimento_observacoes_historico.usuario_email IS 'Email do usuário que adicionou a observação';
COMMENT ON COLUMN public.atendimento_observacoes_historico.usuario_nome IS 'Nome do usuário que adicionou a observação';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.atendimento_observacoes_historico ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura para usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados"
  ON public.atendimento_observacoes_historico
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Criar política para permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção para usuários autenticados"
  ON public.atendimento_observacoes_historico
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Criar política para permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização para usuários autenticados"
  ON public.atendimento_observacoes_historico
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Criar política para permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão para usuários autenticados"
  ON public.atendimento_observacoes_historico
  FOR DELETE
  USING (auth.role() = 'authenticated');
