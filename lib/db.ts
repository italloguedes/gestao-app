import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getDb() {
  return {
    async run(query: string, params: string[] = []) {
      const { data, error } = await supabase.from('images').upsert([
        {
          filename: params[0],
          username: params[1],
          created_at: params[2],
        },
      ]);

      if (error) throw error;
      return data;
    },

    async all(query: string) {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  };
} 