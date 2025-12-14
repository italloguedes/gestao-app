-- ==============================================================================
-- Schema for Pre-Scheduling System
-- ==============================================================================

-- 1. Table: links_agendamento
-- Stores generated public links for pre-scheduling.
CREATE TABLE IF NOT EXISTS links_agendamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- RLS for links_agendamento
ALTER TABLE links_agendamento ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on links_agendamento"
ON links_agendamento
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()::text -- Cast UUID to TEXT
        AND (users.role = 'admin' OR users.role = 'superadmin')
    )
);

-- Public (anon) can read active links to validate tokens
CREATE POLICY "Public read active links"
ON links_agendamento
FOR SELECT
TO anon, authenticated
USING (ativo = true);


-- 2. Table: pre_agendamentos
-- Stores appointment requests waiting for approval.
CREATE TABLE IF NOT EXISTS pre_agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID REFERENCES links_agendamento(id),
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    telefone TEXT NOT NULL,
    certidao_url TEXT, -- URL from Storage
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validado_em TIMESTAMP WITH TIME ZONE,
    validado_por UUID REFERENCES auth.users(id)
);

-- RLS for pre_agendamentos
ALTER TABLE pre_agendamentos ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on pre_agendamentos"
ON pre_agendamentos
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()::text -- Cast UUID to TEXT
        AND (users.role = 'admin' OR users.role = 'superadmin')
    )
);

-- Public (anon) can insert if they have a valid link_id
CREATE POLICY "Public insert pre_agendamentos"
ON pre_agendamentos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
