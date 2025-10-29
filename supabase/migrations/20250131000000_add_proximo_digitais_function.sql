-- Create function to get next person in digital collection queue with row-level locking
-- This prevents race conditions when multiple attendants call at the same time

CREATE OR REPLACE FUNCTION get_proximo_atendimento_digitais(
  p_atendente_id UUID,
  p_atendente_nome VARCHAR(255)
)
RETURNS TABLE (
  atendimento_id BIGINT,
  chamada_id BIGINT,
  nome VARCHAR(255),
  cpf VARCHAR(14),
  preferencial BOOLEAN,
  agendamento_id BIGINT
) AS $$
DECLARE
  v_atendimento RECORD;
  v_chamada_id BIGINT;
BEGIN
  -- Select next person in queue with row-level lock
  -- SKIP LOCKED ensures if row is locked by another transaction, it's skipped
  -- This prevents two attendants from getting the same person
  SELECT
    a.id,
    a.nome,
    a.cpf,
    a.preferencial,
    a.agendamento_id
  INTO v_atendimento
  FROM atendimentos a
  WHERE a.fotos_coletadas = false
    AND a.status = 'em_atendimento'
    AND NOT EXISTS (
      -- Exclude people already called (not yet collected, absent, or rescheduled)
      SELECT 1
      FROM chamada_digitais cd
      WHERE cd.atendimento_id = a.id
        AND cd.status IN ('chamado', 'coletando')
    )
  ORDER BY
    a.preferencial DESC,  -- Preferential first
    a.created_at ASC      -- Then by arrival time
  LIMIT 1
  FOR UPDATE SKIP LOCKED;  -- Critical: atomic lock to prevent race conditions

  -- If no one found in queue, return empty
  IF v_atendimento IS NULL THEN
    RETURN;
  END IF;

  -- Insert call record
  INSERT INTO chamada_digitais (
    atendimento_id,
    agendamento_id,
    nome,
    cpf,
    status,
    atendente_id,
    atendente_nome,
    preferencial,
    data_hora_chamada
  ) VALUES (
    v_atendimento.id,
    v_atendimento.agendamento_id,
    v_atendimento.nome,
    v_atendimento.cpf,
    'chamado',
    p_atendente_id,
    p_atendente_nome,
    v_atendimento.preferencial,
    NOW()
  )
  RETURNING id INTO v_chamada_id;

  -- Return the result
  RETURN QUERY
  SELECT
    v_atendimento.id::BIGINT,
    v_chamada_id::BIGINT,
    v_atendimento.nome,
    v_atendimento.cpf,
    v_atendimento.preferencial,
    v_atendimento.agendamento_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_proximo_atendimento_digitais IS 'Atomically gets next person in digital collection queue and creates call record. Uses SELECT FOR UPDATE SKIP LOCKED to prevent race conditions.';
