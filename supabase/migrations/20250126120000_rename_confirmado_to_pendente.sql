-- Rename 'confirmado' to 'pendente' in agendamentos table
UPDATE agendamentos SET status = 'pendente' WHERE status = 'confirmado';
