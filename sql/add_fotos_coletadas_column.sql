-- Script para adicionar a coluna fotos_coletadas na tabela atendimentos
-- Execute este script no SQL Editor do Supabase

-- Adicionar a coluna fotos_coletadas se não existir
ALTER TABLE atendimentos 
ADD COLUMN IF NOT EXISTS fotos_coletadas BOOLEAN DEFAULT FALSE;

-- Adicionar comentário à coluna
COMMENT ON COLUMN atendimentos.fotos_coletadas IS 'Indica se as fotos biométricas do atendimento foram coletadas';

-- Criar índice para melhorar performance em consultas filtradas por fotos_coletadas
CREATE INDEX IF NOT EXISTS idx_atendimentos_fotos_coletadas 
ON atendimentos(fotos_coletadas);

-- Verificar se a coluna foi criada corretamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'atendimentos' 
AND column_name = 'fotos_coletadas';

-- Opcional: Atualizar registros existentes (descomente se necessário)
-- UPDATE atendimentos SET fotos_coletadas = FALSE WHERE fotos_coletadas IS NULL;

