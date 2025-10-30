-- Create function to get next person in digital collection queue with row-level locking
-- This prevents race conditions when multiple attendants call at the same time

CREATE OR REPLACE FUNCTION get_proximo_atendimento_digitais(
  p_atendente_id UUID,
  p_atendente_nome VARCHAR(255)
)
RETURNS TABLE (
  chamada_id BIGINT,
  atendimento_id BIGINT,
  agendamento_id BIGINT,
  nome VARCHAR(255),
  cpf VARCHAR(14),
  preferencial BOOLEAN,
  status VARCHAR(20),
  atendente_id UUID,
  atendente_nome VARCHAR(255),
  data_hora_chamada TIMESTAMPTZ
) AS $$
DECLARE
  v_agendamento RECORD;
  v_chamada_id BIGINT;
BEGIN
  -- Select next person in queue with row-level lock
  -- SKIP LOCKED ensures if row is locked by another transaction, it's skipped
  -- This prevents two attendants from getting the same person
  SELECT
    a.id,
    a.nome_completo,
    a.cpf,
    a.atendimento_preferencial,
    a.fotos_coletadas
  INTO v_agendamento
  FROM agendamentos a
  WHERE a.data_agendamento = CURRENT_DATE
    AND a.status = 'confirmado'
    AND a.fotos_coletadas = false
    AND NOT EXISTS (
      -- Exclude people already called and not yet completed
      SELECT 1
      FROM chamada_digitais cd
      WHERE cd.agendamento_id = a.id
        AND cd.status IN ('chamado', 'coletando')
    )
  ORDER BY
    a.atendimento_preferencial DESC NULLS LAST,  -- Preferential first
    a.horario ASC                                 -- Then by scheduled time
  LIMIT 1
  FOR UPDATE SKIP LOCKED;  -- Critical: atomic lock to prevent race conditions

  -- If no one found in queue, return empty
  IF v_agendamento IS NULL THEN
    RETURN;
  END IF;

  -- Insert call record atomically in same transaction
  INSERT INTO chamada_digitais (
    agendamento_id,
    atendimento_id,
    nome,
    cpf,
    status,
    atendente_id,
    atendente_nome,
    preferencial,
    data_hora_chamada
  ) VALUES (
    v_agendamento.id,
    v_agendamento.id,  -- Using agendamento_id as atendimento_id for now
    v_agendamento.nome_completo,
    v_agendamento.cpf,
    'chamado',
    p_atendente_id,
    p_atendente_nome,
    COALESCE(v_agendamento.atendimento_preferencial, false),
    NOW()
  )
  RETURNING
    id,
    agendamento_id,
    atendimento_id,
    nome,
    cpf,
    status,
    atendente_id,
    atendente_nome,
    preferencial,
    data_hora_chamada
  INTO
    v_chamada_id,
    agendamento_id,
    atendimento_id,
    nome,
    cpf,
    status,
    get_proximo_atendimento_digitais.atendente_id,
    get_proximo_atendimento_digitais.atendente_nome,
    preferencial,
    data_hora_chamada;

  -- Set chamada_id and return the record
  chamada_id := v_chamada_id;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_proximo_atendimento_digitais IS
'Atomically gets the next person from the digital collection queue and creates a call record. Uses FOR UPDATE SKIP LOCKED to prevent race conditions when multiple attendants call simultaneously.';
