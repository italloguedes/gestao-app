-- Create user_settings table to store user preferences and configurations
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS user_settings_settings_idx ON user_settings USING GIN(settings);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Add comments to document the table
COMMENT ON TABLE user_settings IS 'Store user preferences and configuration settings';
COMMENT ON COLUMN user_settings.user_id IS 'Foreign key to auth.users.id';
COMMENT ON COLUMN user_settings.settings IS 'JSON object containing user preferences and settings';
COMMENT ON COLUMN user_settings.created_at IS 'Timestamp when the settings were first created';
COMMENT ON COLUMN user_settings.updated_at IS 'Timestamp when the settings were last updated';

-- Example of default settings structure (for documentation)
-- {
--   "notifications": {
--     "email": true,
--     "browser": true,
--     "appointments": true,
--     "reminders": true
--   },
--   "preferences": {
--     "theme": "light",
--     "language": "pt",
--     "timezone": "America/Fortaleza",
--     "dateFormat": "dd/mm/yyyy"
--   },
--   "privacy": {
--     "profileVisibility": "private",
--     "showEmail": false,
--     "showPhone": false
--   }
-- }
