-- Enable Realtime for chamada_digitais table
-- This allows Supabase to broadcast changes to all connected clients in real-time

ALTER PUBLICATION supabase_realtime ADD TABLE chamada_digitais;

-- Add comment for documentation
COMMENT ON TABLE chamada_digitais IS
'Digital collection call queue. Realtime enabled for multi-attendant synchronization.';
