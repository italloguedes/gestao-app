-- Script para adicionar a coluna atendimento_preferencial na tabela agendamentos
-- Execute este script no SQL Editor do Supabase

-- Adicionar a coluna atendimento_preferencial
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS atendimento_preferencial BOOLEAN DEFAULT FALSE;

-- Adicionar comentário à coluna
COMMENT ON COLUMN agendamentos.atendimento_preferencial IS 'Indica se o agendamento é para atendimento preferencial';

-- Verificar se a coluna foi criada corretamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'agendamentos' 
AND column_name = 'atendimento_preferencial';
