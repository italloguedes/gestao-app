-- Allow public (anon) to read pre_agendamentos
-- This is required for the public list of requests feature.

CREATE POLICY "Public read pre_agendamentos"
ON pre_agendamentos
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM links_agendamento
        WHERE links_agendamento.id = pre_agendamentos.link_id
        AND links_agendamento.ativo = true
    )
);
