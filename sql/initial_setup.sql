-- ========================================
-- SCRIPT DE CONFIGURAÇÃO INICIAL
-- Execute este script após criar a tabela users
-- ========================================

-- 1. Criar o primeiro Super Administrador
-- IMPORTANTE: Substitua os valores abaixo pelos dados reais

INSERT INTO users (name, email, role, status, created_at, updated_at)
VALUES (
    'Super Administrador',           -- Nome completo
    'admin@seudominio.com',          -- Email (ALTERE AQUI!)
    'superadmin',                     -- Role
    'active',                         -- Status
    NOW(),                            -- Data de criação
    NOW()                             -- Data de atualização
)
ON CONFLICT (email) DO UPDATE
SET role = 'superadmin',
    status = 'active',
    updated_at = NOW();

-- 2. (Opcional) Criar usuários de exemplo para teste

-- Administrador de exemplo
INSERT INTO users (name, email, role, status, created_at, updated_at)
VALUES (
    'João Administrador',
    'admin@exemplo.com',
    'admin',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Atendente de exemplo
INSERT INTO users (name, email, role, status, created_at, updated_at)
VALUES (
    'Maria Atendente',
    'atendente@exemplo.com',
    'atendente',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Usuário comum de exemplo
INSERT INTO users (name, email, role, status, created_at, updated_at)
VALUES (
    'Carlos Usuário',
    'usuario@exemplo.com',
    'user',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 3. Verificar todos os usuários criados
SELECT
    id,
    name,
    email,
    role,
    status,
    auth_id,
    created_at,
    CASE
        WHEN role = 'superadmin' THEN '👑 Super Administrador'
        WHEN role = 'admin' THEN '⚡ Administrador'
        WHEN role = 'atendente' THEN '👨‍💼 Atendente'
        WHEN role = 'user' THEN '👤 Usuário'
    END as role_descricao
FROM users
ORDER BY
    CASE role
        WHEN 'superadmin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'atendente' THEN 3
        WHEN 'user' THEN 4
    END,
    created_at;

-- 4. (Opcional) Estatísticas
SELECT
    role,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as ativos,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inativos
FROM users
GROUP BY role
ORDER BY
    CASE role
        WHEN 'superadmin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'atendente' THEN 3
        WHEN 'user' THEN 4
    END;
