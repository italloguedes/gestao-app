-- Script para verificar agendamentos no banco de dados
-- Execute este script no SQL Editor do Supabase

-- Verificar se a tabela agendamentos existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'agendamentos';

-- Verificar estrutura da tabela agendamentos
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'agendamentos' 
ORDER BY ordinal_position;

-- Verificar todos os agendamentos
SELECT * FROM agendamentos ORDER BY data DESC, horario ASC LIMIT 10;

-- Verificar agendamentos de hoje
SELECT * FROM agendamentos 
WHERE data = CURRENT_DATE 
ORDER BY horario ASC;

-- Contar total de agendamentos
SELECT COUNT(*) as total_agendamentos FROM agendamentos;

-- Verificar agendamentos por status
SELECT status, COUNT(*) as quantidade 
FROM agendamentos 
GROUP BY status;
