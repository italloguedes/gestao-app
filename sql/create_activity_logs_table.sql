-- ========================================
-- TABELA DE LOG DE ATIVIDADES (AUDIT LOG)
-- Registra todas as ações realizadas no sistema
-- para conferência e auditoria
-- ========================================

-- 1. Criar a tabela principal
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Quem fez a ação
  user_id TEXT,                    -- ID do usuário (auth_id ou user.id)
  user_name TEXT,                  -- Nome do usuário no momento da ação
  user_email TEXT,                 -- Email do usuário
  user_role TEXT,                  -- Role no momento (superadmin, admin, atendente)

  -- O que foi feito
  action TEXT NOT NULL,            -- Tipo da ação (create, update, delete, login, logout, upload, etc.)
  entity_type TEXT NOT NULL,       -- Tipo da entidade (atendimento, agendamento, user, file, etc.)
  entity_id TEXT,                  -- ID do registro afetado

  -- Detalhes
  description TEXT NOT NULL,       -- Descrição legível (ex: "Criou novo atendimento para João Silva")
  details JSONB,                   -- Detalhes extras (valores antes/depois, metadados)

  -- Metadados
  ip_address TEXT,                 -- IP do usuário (quando disponível via API)
  module TEXT                      -- Módulo do sistema (dashboard, admin, api, auth)
);

-- 2. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs ((created_at::date));

-- 3. Habilitar RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Política de INSERT: qualquer usuário autenticado pode inserir logs
CREATE POLICY "Usuários autenticados podem inserir logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Política de SELECT: apenas admin e superadmin podem ler logs
-- Nota: esta política usa a tabela users para verificar a role.
-- Se preferir verificar via JWT claims, ajuste conforme necessário.
CREATE POLICY "Admins podem ler logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()::text
      AND users.role IN ('superadmin', 'admin')
    )
  );

-- 6. Permitir que o service_role (usado nas APIs do servidor) tenha acesso total
-- O service_role já ignora RLS por padrão no Supabase, mas para garantir:
CREATE POLICY "Service role tem acesso total aos logs"
  ON activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Comentário na tabela
COMMENT ON TABLE activity_logs IS 'Registro de todas as atividades realizadas no sistema para auditoria e conferência';
