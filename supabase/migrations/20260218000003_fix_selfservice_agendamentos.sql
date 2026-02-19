-- Restore self-service access for /agendamento route without reopening public exposure.
-- Authenticated end-users can only read/insert/delete their own records.

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario pode ler seus agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Usuario pode inserir seus agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Usuario pode cancelar seus agendamentos" ON public.agendamentos;

CREATE POLICY "Usuario pode ler seus agendamentos"
ON public.agendamentos
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Usuario pode inserir seus agendamentos"
ON public.agendamentos
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status IN ('confirmado', 'pendente')
);

CREATE POLICY "Usuario pode cancelar seus agendamentos"
ON public.agendamentos
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
