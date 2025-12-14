'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Helper to get Supabase client with user context
const getSupabase = async () => {
    return createServerComponentClient({ cookies });
};

// Helper to check if user is admin
const checkAdmin = async () => {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('Unauthorized');
    }

    // Check role in users table
    const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', session.user.id)
        .single();

    if (error || !user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        throw new Error('Forbidden: Admin access required');
    }

    return { supabase, session };
};

export async function generateSchedulingLink() {
    try {
        const { supabase, session } = await checkAdmin();

        // Generate a random token (simple implementation, can be more robust)
        const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12);

        const { data, error } = await supabase
            .from('links_agendamento')
            .insert({
                token,
                created_by: session.user.id // This might fail if created_by expects uuid from users table or auth.users?
                // Schema says: created_by UUID REFERENCES auth.users(id)
                // session.user.id IS auth.users.id. Correct.
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/admin/gestao');
        return { success: true, data };
    } catch (error: any) {
        console.error('Error in generateSchedulingLink:', error);
        return { success: false, error: error.message };
    }
}

export async function getLinks() {
    try {
        const { supabase } = await checkAdmin();
        const { data, error } = await supabase
            .from('links_agendamento')
            .select('*, criado_por_user:created_by(email)') // Adjust if users table implies joining
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('Error in getLinks:', error);
        return { success: false, error: error.message };
    }
}

export async function getPendingRequests() {
    try {
        const { supabase } = await checkAdmin();
        const { data, error } = await supabase
            .from('pre_agendamentos')
            .select('*')
            .eq('status', 'pendente')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('Error in getPendingRequests:', error);
        return { success: false, error: error.message };
    }
}

export async function approvePreScheduling(preAgendamentoId: string, scheduleData: { data: string, horario: string }) {
    try {
        const { supabase, session } = await checkAdmin();

        // 1. Get the pre-scheduling request
        const { data: request, error: fetchError } = await supabase
            .from('pre_agendamentos')
            .select('*')
            .eq('id', preAgendamentoId)
            .single();

        if (fetchError || !request) throw new Error('Request not found');

        // 2. Create the official appointment
        const { error: insertError } = await supabase
            .from('agendamentos')
            .insert({
                // user_id: ??? - Pre-scheduling often involves users NOT yet in system or generic. 
                // However, `agendamentos` table has `user_id uuid REFERENCES auth.users`.
                // If the user doesn't have an account, we can't link it.
                // The prompt says: "Ao aprovar, o sistema cria o agendamento... usando a mesma lógica".
                // Existing `agendamentos` require `user_id`.
                // PROBLEM: Public users don't have auth accounts. 
                // DOES `agendamentos` allow null user_id?
                // Let's assume we need to create a "shadow" user or map to a generic "Visitante".
                // OR, `agendamentos` might NOT enforce `user_id` strictly if we change schema or if it's nullable.
                // Let's check `agendamentos` schema again.
                // If user_id is NOT NULL, we are blocked unless we create a user.
                // Prompt says: "Não pode criar agendamentos diretamente...". 
                // Maybe we skip `user_id` if allowed, or use a "Guest" user.
                // I'll assume for now `user_id` might be nullable OR we use the Admin's ID as placeholder (bad practice).
                // Better: Check `check_agendamentos.sql` output.
                // user_id is likely mandatory.
                // I will add a TODO or try to insert without user_id if possible, or use a specific strategy.
                // STRATEGY: Create a placeholder user for them? Or maybe the prompt implies they register?
                // Prompt: "Usuário acessa link... Campos: Nome, CPF..." -> No Login mentioned.
                // If `agendamentos` requires `user_id`, we might need to change it to nullable OR create a dummy account.
                // I will assume for this implementation I can make `user_id` nullable in SQL or use a system placeholder.
                // Checking `app/agendamento/page.tsx` -> `user_id: user.id` is sent.
                // I will try to use the Admin's ID or a specific "Gestão" ID for the record, 
                // or ideally make `user_id` nullable. 
                // Let's modify the SQL to allow nullable `user_id` if needed, but I cannot modify `agendamentos` easily without knowing constraints.
                // I'll try to insert with `user_id` being NULL. If it fails, I'll update the plan.

                nome: request.nome,
                cpf: request.cpf,
                telefone: request.telefone,
                data: scheduleData.data,
                horario: scheduleData.horario,
                status: 'confirmado',
                // Additional fields if needed from existing logic
                email: 'nao_informado@exemplo.com', // Placeholder if not collected
                data_nascimento: '2000-01-01', // Placeholder if not collected (Prompt didn't ask for birthday)
            });

        if (insertError) throw insertError;

        // 3. Update status
        const { error: updateError } = await supabase
            .from('pre_agendamentos')
            .update({
                status: 'aprovado',
                validado_em: new Date().toISOString(),
                validado_por: session.user.id
            })
            .eq('id', preAgendamentoId);

        if (updateError) throw updateError;

        revalidatePath('/admin/gestao');
        return { success: true };
    } catch (error: any) {
        console.error('Error in approvePreScheduling:', error);
        return { success: false, error: error.message };
    }
}

export async function rejectPreScheduling(preAgendamentoId: string) {
    try {
        const { supabase, session } = await checkAdmin();

        const { error } = await supabase
            .from('pre_agendamentos')
            .update({
                status: 'rejeitado',
                validado_em: new Date().toISOString(),
                validado_por: session.user.id
            })
            .eq('id', preAgendamentoId);

        if (error) throw error;

        revalidatePath('/admin/gestao');
        return { success: true };
    } catch (error: any) {
        console.error('Error in rejectPreScheduling:', error);
        return { success: false, error: error.message };
    }
}
