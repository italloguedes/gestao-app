-- Restore RLS for atendimento_observacoes_historico
-- and keep only authenticated access on direct SQL/API access.

ALTER TABLE public.atendimento_observacoes_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Permitir exclusão para usuários autenticados" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Observacoes read authenticated" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Observacoes insert authenticated" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Observacoes update authenticated" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Observacoes delete authenticated" ON public.atendimento_observacoes_historico;

CREATE POLICY "Observacoes read authenticated"
ON public.atendimento_observacoes_historico
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Observacoes insert authenticated"
ON public.atendimento_observacoes_historico
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Observacoes update authenticated"
ON public.atendimento_observacoes_historico
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Observacoes delete authenticated"
ON public.atendimento_observacoes_historico
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');
