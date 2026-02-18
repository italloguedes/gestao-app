-- Harden agendamentos policies:
-- 1) remove anonymous read access from base table (PII exposure risk)
-- 2) keep access only for authenticated staff roles

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publico pode ler chamadas" ON public.agendamentos;
DROP POLICY IF EXISTS "Atendentes podem atualizar status" ON public.agendamentos;
DROP POLICY IF EXISTS "Equipe pode ler agendamentos" ON public.agendamentos;

CREATE POLICY "Equipe pode ler agendamentos"
ON public.agendamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.auth_id = auth.uid()::text
      AND users.role IN ('atendente', 'admin', 'superadmin')
      AND users.status = 'active'
  )
);

CREATE POLICY "Equipe pode atualizar agendamentos"
ON public.agendamentos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.auth_id = auth.uid()::text
      AND users.role IN ('atendente', 'admin', 'superadmin')
      AND users.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.auth_id = auth.uid()::text
      AND users.role IN ('atendente', 'admin', 'superadmin')
      AND users.status = 'active'
  )
);
