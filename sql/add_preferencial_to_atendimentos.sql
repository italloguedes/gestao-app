-- Script para adicionar a coluna atendimento_preferencial na tabela atendimentos
-- Esta coluna indica se o atendimento é preferencial (idosos, gestantes, PCD, etc.)

-- Adicionar a coluna atendimento_preferencial
ALTER TABLE atendimentos
ADD COLUMN IF NOT EXISTS atendimento_preferencial BOOLEAN DEFAULT FALSE;

-- Adicionar comentário na coluna
COMMENT ON COLUMN atendimentos.atendimento_preferencial IS 'Indica se o atendimento é preferencial (idosos, gestantes, PCD, etc.)';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'atendimentos'
AND column_name = 'atendimento_preferencial';
