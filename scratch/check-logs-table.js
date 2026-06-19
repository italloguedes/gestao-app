const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      env[match[1]] = value;
    }
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  console.log('Connecting to Supabase...');
  
  // Check if activity_logs table exists
  const { data, error } = await supabase
    .from('activity_logs')
    .select('count')
    .limit(1);

  if (error) {
    console.log('Error querying activity_logs (probably table does not exist):', error.message);
    
    // Check if we have exec_sql RPC
    console.log('Checking for exec_sql RPC...');
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS public.activity_logs (
        id BIGSERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(255) NOT NULL,
        description TEXT,
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        user_role VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/Fortaleza'::text, now()) NOT NULL
      );
      
      -- Index for performance
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
      
      -- Enable RLS
      ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
      
      -- Policies
      CREATE POLICY "Allow select for authenticated" ON public.activity_logs
        FOR SELECT USING (auth.role() = 'authenticated');
        
      CREATE POLICY "Allow insert for authenticated" ON public.activity_logs
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    `;
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { sql: createTableSql });
    if (rpcError) {
      console.error('Failed to execute migration SQL via exec_sql:', rpcError.message);
    } else {
      console.log('Successfully created activity_logs table via exec_sql RPC!');
    }
  } else {
    console.log('activity_logs table already exists. Data:', data);
  }
}

main().catch(console.error);
