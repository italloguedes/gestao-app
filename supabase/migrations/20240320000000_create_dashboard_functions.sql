-- Create function to get atendimentos stats
CREATE OR REPLACE FUNCTION get_atendimentos_stats(data_atual date)
RETURNS TABLE (
  total bigint,
  correcoes bigint,
  em_andamento bigint,
  concluidos bigint,
  bloqueados bigint,
  hoje bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM atendimentos) as total,
    (SELECT COUNT(*) FROM atendimentos WHERE status = 'correcao') as correcoes,
    (SELECT COUNT(*) FROM atendimentos WHERE status = 'em_andamento') as em_andamento,
    (SELECT COUNT(*) FROM atendimentos WHERE status IN ('concluido', 'concluído', 'Concluido', 'Concluído')) as concluidos,
    (SELECT COUNT(*) FROM atendimentos WHERE status = 'bloqueado') as bloqueados,
    (SELECT COUNT(*) FROM atendimentos WHERE dia_atual = data_atual) as hoje;
END;
$$;

-- Create function to get agendamentos stats
CREATE OR REPLACE FUNCTION get_agendamentos_stats()
RETURNS TABLE (
  pendentes bigint,
  confirmados bigint,
  cancelados bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM agendamentos WHERE status = 'pendente') as pendentes,
    (SELECT COUNT(*) FROM agendamentos WHERE status = 'confirmado') as confirmados,
    (SELECT COUNT(*) FROM agendamentos WHERE status = 'cancelado') as cancelados;
END;
$$; 