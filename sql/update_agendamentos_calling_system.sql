-- Add columns for the calling system
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS senha INTEGER;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'normal'; -- 'normal' | 'preferencial'
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS atendente_id UUID REFERENCES auth.users(id);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS horario_chamada TIMESTAMP WITH TIME ZONE;

-- Ensure status column accepts new values if it has a check constraint
-- (This part is tricky in generic SQL without dropping constraint, so we assume it's text or we'd need to recreate the constraint)
-- For safety, let's just ensure the column exists.
-- If there is a check constraint that fails, the user will need to run a specific command to drop it.
-- But usually in Supabase UI created tables, it's just text.

-- Create index for performance on calling queue
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_data_horario ON agendamentos(status, data, horario);
CREATE INDEX IF NOT EXISTS idx_agendamentos_tipo ON agendamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_agendamentos_horario_chamada ON agendamentos(horario_chamada);

-- Add RLS policies
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- Allow attendants to update (call)
-- Note: You might need to adjust the role check based on your specific roles setup
CREATE POLICY "Atendentes podem atualizar status"
ON agendamentos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public (anon) to read for the panel
CREATE POLICY "Publico pode ler chamadas"
ON agendamentos
FOR SELECT
TO anon
USING (true);

-- Function to get next call safely (atomic)
CREATE OR REPLACE FUNCTION chamar_proximo(p_atendente_id UUID)
RETURNS SETOF agendamentos AS $$
DECLARE
  v_agendamento_id BIGINT;
BEGIN
  -- 1. Tentar encontrar preferencial agendado para hoje que ainda não foi chamado
  SELECT a.id INTO v_agendamento_id
  FROM agendamentos a
  WHERE a.data = CURRENT_DATE
    AND (a.status = 'pendente' OR a.status = 'confirmado' OR a.status = 'agendado')
    AND (a.tipo = 'preferencial' OR a.atendimento_preferencial = true)
  ORDER BY a.horario ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Lock row to prevent race conditions

  -- 2. Se não encontrar preferencial, buscar normal
  IF v_agendamento_id IS NULL THEN
    SELECT a.id INTO v_agendamento_id
    FROM agendamentos a
    WHERE a.data = CURRENT_DATE
      AND (a.status = 'pendente' OR a.status = 'confirmado' OR a.status = 'agendado')
    ORDER BY a.horario ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  -- 3. Se encontrou alguém
  IF v_agendamento_id IS NOT NULL THEN
    -- Gerar senha se não existir (simples sequencial baseado no id ou aleatório, aqui usando id para simplificar ou um sequence se preferir)
    -- Para simplificar, vamos usar o ID como senha se for null, ou um numero sequencial do dia
    
    RETURN QUERY
    UPDATE agendamentos
    SET 
      status = 'chamando',
      atendente_id = p_atendente_id,
      senha = COALESCE(senha, (SELECT COUNT(*) + 1 FROM agendamentos WHERE data = CURRENT_DATE AND status IN ('chamando', 'concluido', 'atendendo'))),
      horario_chamada = NOW()
    WHERE agendamentos.id = v_agendamento_id
    RETURNING *;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
