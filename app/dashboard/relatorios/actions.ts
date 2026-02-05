'use server';

import { supabaseServer } from '@/lib/supabase-server';

export async function searchApplicants(query: string) {
    try {
        const { data, error } = await supabaseServer
            .from('atendimentos')
            .select('solicitante')
            .ilike('solicitante', `%${query}%`)
            .limit(50);

        if (error) {
            console.error('Error fetching applicants:', error);
            return [];
        }

        // Filter unique values
        // Using Set to remove duplicates from the fetched 50 items.
        // Note: Ideally we would use distinct in the query, but supabase-js simple query syntax 
        // for distinct requires a bit more work or RPC. This should be sufficient for autocomplete.
        const uniqueApplicants = Array.from(new Set(data?.map(item => item.solicitante))).filter(Boolean);

        return uniqueApplicants.map(app => ({
            value: app,
            label: app
        })).sort((a, b) => a.label.localeCompare(b.label));

    } catch (error) {
        console.error('Unexpected error searching applicants:', error);
        return [];
    }
}
