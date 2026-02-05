-- Add locking columns to agendamentos table
ALTER TABLE agendamentos
ADD COLUMN IF NOT EXISTS locked_by TEXT REFERENCES users(auth_id),
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS agendamentos_locked_by_idx ON agendamentos(locked_by);
