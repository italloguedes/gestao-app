-- Script para definir um usuário como Super Administrador
-- Execute este script no SQL Editor do Supabase

-- Opção 1: Definir superadmin por EMAIL
-- Substitua 'seu-email@example.com' pelo email do usuário
UPDATE users
SET role = 'superadmin',
    status = 'active',
    updated_at = NOW()
WHERE email = 'seu-email@example.com';

-- Opção 2: Definir superadmin por AUTH_ID
-- Substitua 'auth-id-do-usuario' pelo auth_id do Supabase Auth
-- UPDATE users
-- SET role = 'superadmin',
--     status = 'active',
--     updated_at = NOW()
-- WHERE auth_id = 'auth-id-do-usuario';

-- Opção 3: Criar um novo usuário superadmin diretamente
-- (use isso se o usuário ainda não existe na tabela users)
-- INSERT INTO users (name, email, role, status, created_at, updated_at)
-- VALUES (
--     'Super Admin',
--     'admin@seudominio.com',
--     'superadmin',
--     'active',
--     NOW(),
--     NOW()
-- );

-- Verificar se a atualização funcionou
SELECT id, name, email, role, status, auth_id, created_at
FROM users
WHERE role = 'superadmin';
