-- Adicionar colunas em falta à tabela activity_logs caso já exista
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255);
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(255);
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS module VARCHAR(255);

-- Adicionar índices para novas colunas se necessário
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON public.activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON public.activity_logs(module);
