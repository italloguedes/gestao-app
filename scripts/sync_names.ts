import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
  const { data: authResult, error: err1 } = await supabase.auth.admin.listUsers();
  if (err1) { console.error('Error fetching users:', err1); return; }
  
  if (!authResult?.users) return;

  for (const user of authResult.users) {
    const name = user.user_metadata?.name || user.user_metadata?.full_name;
    if (name) {
      const { error: err2 } = await supabase.from('users').update({ name }).eq('auth_id', user.id);
      if (err2) {
        console.error(`Failed to sync ${name}:`, err2);
      } else {
        console.log(`Synced: ${name}`);
      }
    }
  }
}

sync().then(() => console.log('Done'));
