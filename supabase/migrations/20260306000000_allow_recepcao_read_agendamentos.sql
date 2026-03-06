-- Allow reception role to read agendamentos in admin "hoje" screen.
-- Keep write operations restricted to attendant/admin/superadmin.

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
      AND users.role IN ('recepcao', 'atendente', 'admin', 'superadmin')
      AND users.status = 'active'
  )
);
