-- Adicionar campo para armazenar assinatura digital em base64
-- Execute este script no Supabase SQL Editor

ALTER TABLE atendimentos
ADD COLUMN IF NOT EXISTS assinatura_base64 TEXT;

COMMENT ON COLUMN atendimentos.assinatura_base64 IS 'Assinatura digital do recebedor em formato base64 (data URL)';
