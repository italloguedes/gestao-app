-- Criar tabela de logs de atividades do sistema (activity_logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(255) NOT NULL,
  description TEXT,
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  user_role VARCHAR(255),
  entity_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(255),
  module VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/Fortaleza'::text, now()) NOT NULL
);

-- Criar índice para melhorar performance nas buscas por data de criação descrescente
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON public.activity_logs(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Política de inserção: qualquer usuário autenticado pode registrar logs
CREATE POLICY "Permitir inserção para usuários autenticados"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política de leitura: apenas administradores e superadministradores ativos podem visualizar os logs
CREATE POLICY "Permitir leitura apenas para admin e superadmin"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.auth_id = auth.uid()::text
        AND users.role IN ('admin', 'superadmin')
        AND users.status = 'active'
    )
  );

-- Comentários para documentação
COMMENT ON TABLE public.activity_logs IS 'Logs de auditoria e atividades gerais do sistema';
COMMENT ON COLUMN public.activity_logs.action IS 'Ação realizada (ex: login, logout, criacao_usuario)';
COMMENT ON COLUMN public.activity_logs.entity_type IS 'Tipo da entidade afetada (ex: session, user, agendamento)';
COMMENT ON COLUMN public.activity_logs.description IS 'Descrição textual da ação';
COMMENT ON COLUMN public.activity_logs.user_id IS 'ID do usuário que executou a ação';
COMMENT ON COLUMN public.activity_logs.user_email IS 'Email do usuário que executou a ação';
COMMENT ON COLUMN public.activity_logs.user_role IS 'Função (role) do usuário no momento da ação';
COMMENT ON COLUMN public.activity_logs.created_at IS 'Data/hora em que a ação ocorreu (fuso de Fortaleza)';
