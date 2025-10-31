-- Enable Realtime for atendimentos table
-- This allows Supabase to broadcast changes to all connected clients in real-time
-- When an attendant calls someone (status changes to 'chamando'), all other attendants see the update

ALTER PUBLICATION supabase_realtime ADD TABLE atendimentos;

-- Add comment for documentation
COMMENT ON TABLE atendimentos IS
'Service records. Realtime enabled for multi-attendant synchronization in digital collection queue.';
