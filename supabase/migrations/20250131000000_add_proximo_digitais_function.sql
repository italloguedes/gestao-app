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
    a.email,
    a.fotos_coletadas
  INTO v_atendimento
  FROM atendimentos a
  WHERE a.dia_atual = to_char(CURRENT_DATE, 'YYYY-MM-DD')  -- Formato ISO para match com o banco
    AND a.status = 'em_andamento'
    AND a.fotos_coletadas = false
    AND NOT EXISTS (
      -- Exclude people already called and not yet completed
      SELECT 1
      FROM chamada_digitais cd
      WHERE cd.atendimento_id = a.id
        AND cd.status IN ('chamado', 'coletando')
    )
  ORDER BY
    a.horario ASC  -- Order by service time
  LIMIT 1
  FOR UPDATE SKIP LOCKED;  -- Critical: atomic lock to prevent race conditions

  -- If no one found in queue, return empty
  IF v_atendimento IS NULL THEN
    RETURN;
  END IF;

  -- Insert call record atomically in same transaction
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
    v_atendimento.id,  -- Using atendimento_id as both (agendamento link can be added later if needed)
    v_atendimento.nome,
    v_atendimento.cpf,
    'chamado',
    p_atendente_id,
    p_atendente_nome,
    false,  -- Tabela atendimentos não tem preferencial
    NOW()
  )
  RETURNING
    id,
    atendimento_id,
    agendamento_id,
    nome,
    cpf,
    status,
    atendente_id,
    atendente_nome,
    preferencial,
    data_hora_chamada
  INTO
    v_chamada_id,
    atendimento_id,
    agendamento_id,
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
