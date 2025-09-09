-- Atualizar a tabela users para incluir o perfil superadmin
-- Este script deve ser executado no Supabase SQL Editor

-- Primeiro, vamos verificar se a constraint já permite superadmin
-- Se não permitir, vamos alterar a constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'atendente', 'user'));

-- Opcional: Criar um usuário superadmin de exemplo
-- Descomente as linhas abaixo se quiser criar um superadmin de teste
-- INSERT INTO users (name, email, role, status, auth_id)
-- VALUES ('Super Admin', 'superadmin@example.com', 'superadmin', 'active', 'superadmin-test-id')
-- ON CONFLICT (email) DO UPDATE SET role = 'superadmin';

-- Verificar os usuários existentes
SELECT id, name, email, role, status, auth_id FROM users ORDER BY created_at DESC;
