'use server';

import { getSupabaseServer } from '@/lib/supabase-server';

export async function searchApplicants(query: string): Promise<{ value: string; label: string }[]> {
    try {
        const { data, error } = await getSupabaseServer()
            .from('atendimentos')
            .select('solicitante')
            .ilike('solicitante', `%${query}%`)
            .limit(50);

        if (error) {
            console.error('Error fetching applicants:', error);
            return [];
        }

        const uniqueApplicants = Array.from(new Set((data || []).map((item: any) => item.solicitante))).filter(Boolean) as string[];

        return uniqueApplicants.map(app => ({
            value: app,
            label: app
        })).sort((a, b) => a.label.localeCompare(b.label));

    } catch (error) {
        console.error('Unexpected error searching applicants:', error);
        return [];
    }
}
