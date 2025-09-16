-- Update users table to include profile fields
-- This script adds new columns to support user profile management

-- Add new profile columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS users_department_idx ON users(department);
CREATE INDEX IF NOT EXISTS users_position_idx ON users(position);

-- Update the updated_at trigger to handle new columns
-- The existing trigger should already handle all columns automatically

-- Example of updating existing users with default values (optional)
-- UPDATE users SET 
--   phone = NULL,
--   department = 'Sala Sensorial',
--   position = 'Atendente',
--   avatar_url = NULL,
--   bio = NULL
-- WHERE phone IS NULL AND department IS NULL;

COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.department IS 'User department/sector';
COMMENT ON COLUMN users.position IS 'User job position/title';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN users.bio IS 'User biography/description';
