-- ========================================
-- ADICIONAR COLUNA POSTO À TABELA AGENDAMENTOS
-- Execute este script no SQL Editor do Supabase
-- ========================================

-- 1. Adicionar coluna posto com valor padrão 'Sala Sensorial'
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS posto VARCHAR(50) DEFAULT 'Sala Sensorial';

-- 2. Atualizar agendamentos existentes para terem o posto padrão
UPDATE agendamentos 
SET posto = 'Sala Sensorial' 
WHERE posto IS NULL;

-- 3. Verificar se a coluna foi criada corretamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'agendamentos' AND column_name = 'posto';

-- 4. Mostrar alguns registros para verificar
SELECT id, nome, data, horario, posto 
FROM agendamentos 
ORDER BY created_at DESC 
LIMIT 5;
