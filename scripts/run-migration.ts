import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Executando migration...');

    // Ler arquivo de migration
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251025000000_create_observacoes_historico.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Executar SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Erro ao executar migration:', error);
      process.exit(1);
    }

    console.log('✅ Migration executada com sucesso!');
    console.log('📊 Tabela atendimento_observacoes_historico criada');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

runMigration();
