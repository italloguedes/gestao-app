
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    console.log(`Checking data since ${dateStr}...`);

    // Check using created_at
    const { data: byCreatedAt, error: errorCreatedAt } = await supabase
        .from('atendimentos')
        .select('id, created_at, dia_atual, atendente_nome')
        .gte('created_at', dateStr);

    if (errorCreatedAt) console.error('Error fetching by created_at:', errorCreatedAt);
    else console.log(`Records found by created_at >= ${dateStr}:`, byCreatedAt?.length);

    // Check using dia_atual
    const { data: byDiaAtual, error: errorDiaAtual } = await supabase
        .from('atendimentos')
        .select('id, created_at, dia_atual, atendente_nome')
        .gte('dia_atual', dateStr);

    if (errorDiaAtual) console.error('Error fetching by dia_atual:', errorDiaAtual);
    else console.log(`Records found by dia_atual >= ${dateStr}:`, byDiaAtual?.length);

    // Show a sample if available
    if (byDiaAtual && byDiaAtual.length > 0) {
        console.log('Sample record (dia_atual):', byDiaAtual[0]);
    }
}

checkData();
