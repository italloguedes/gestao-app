-- Fix conflicting/redundant RLS policies on pre_agendamentos
-- Issue: "Admins full access" and "Public read" both granted SELECT to authenticated users, causing redundancy warnings.
-- Solution: Split Admin access into UPDATE/DELETE (Write) and merge SELECT (Read) into a single "Unified read" policy.

-- 1. Drop the conflicting policies
DROP POLICY IF EXISTS "Admins full access on pre_agendamentos" ON pre_agendamentos;
DROP POLICY IF EXISTS "Public read pre_agendamentos" ON pre_agendamentos;

-- 2. Create Admin Write Policies (UPDATE, DELETE)
-- Note: INSERT is already covered by "Public insert pre_agendamentos" which is permissive.
-- We explicitly add Admin policies for Update/Delete which are restricted.

CREATE POLICY "Admins update pre_agendamentos"
ON pre_agendamentos
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()::text
        AND (users.role = 'admin' OR users.role = 'superadmin')
    )
);

CREATE POLICY "Admins delete pre_agendamentos"
ON pre_agendamentos
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()::text
        AND (users.role = 'admin' OR users.role = 'superadmin')
    )
);

-- 3. Create Unified Read Policy (SELECT)
-- Allows access if: User is Admin OR (Link is Active)
CREATE POLICY "Unified read pre_agendamentos"
ON pre_agendamentos
FOR SELECT
TO anon, authenticated
USING (
    -- Admin Access
    (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()::text
        AND (users.role = 'admin' OR users.role = 'superadmin')
    ))
    OR
    -- Public Access (via active link)
    (EXISTS (
        SELECT 1 FROM links_agendamento
        WHERE links_agendamento.id = pre_agendamentos.link_id
        AND links_agendamento.ativo = true
    ))
);
