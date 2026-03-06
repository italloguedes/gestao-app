-- Add missing INSERT and DELETE policies for staff roles on agendamentos.
-- Without these, admins cannot block (INSERT status='bloqueado') or
-- unblock (DELETE) vagas from /admin/vagas.

-- Staff can insert agendamentos (e.g. administrative blocks)
CREATE POLICY "Equipe pode inserir agendamentos"
ON public.agendamentos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.auth_id = auth.uid()::text
      AND users.role IN ('atendente', 'admin', 'superadmin')
      AND users.status = 'active'
  )
);

-- Staff can delete agendamentos (e.g. unblock slots)
CREATE POLICY "Equipe pode deletar agendamentos"
ON public.agendamentos
FOR DELETE
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
