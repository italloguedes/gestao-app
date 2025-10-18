import { supabase } from './supabase-client';

export async function getDb() {
  return {
    async run(params: string[] = []) {
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

    async all() {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  };
} 
