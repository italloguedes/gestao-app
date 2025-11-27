-- Script para adicionar a coluna atendimento_preferencial na tabela atendimentos
-- Execute este script no SQL Editor do Supabase se a coluna ainda não existir

ALTER TABLE atendimentos 
ADD COLUMN IF NOT EXISTS atendimento_preferencial BOOLEAN DEFAULT FALSE;

-- Adicionar comentário à coluna
COMMENT ON COLUMN atendimentos.atendimento_preferencial IS 'Indica se o atendimento é preferencial';
