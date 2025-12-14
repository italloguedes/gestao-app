'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Helper to get Supabase client with user context
const getSupabase = async () => {
    const cookieStore = await cookies();
    // @ts-ignore: Next 15/16 + AuthHelpers types mismatch workaround
    return createServerActionClient({ cookies: () => cookieStore });
};

export async function getAvailableSlots(date: string) {
    // 1. Generate Slots (Sam logic as AgendamentosHojePage)
    const HORARIOS: string[] = [];
    let hora = 7;
    let minuto = 0;
    const endHour = 22;

    while (hora < endHour) {
        const horaStr = hora.toString().padStart(2, "0");
        const minutoStr = minuto.toString().padStart(2, "0");
        HORARIOS.push(`${horaStr}:${minutoStr}`);
        minuto += 5;
        if (minuto >= 60) {
            minuto = 0;
            hora += 1;
        }
    }

    try {
        const cookieStore = cookies();
        const supabase = createServerActionClient({ cookies: () => cookieStore });

        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select('horario')
            .eq('data', date)
            .in('status', ['confirmado', 'bloqueado', 'concluido', 'ausente', 'chamando']);

        if (error) {
            console.error('Error fetching appointments for slots:', error);
            return { success: false, error: 'Erro ao buscar horários.' };
        }

        const occupiedSlots = new Set(agendamentos?.map(a => a.horario.substring(0, 5)));
        const availableSlots = HORARIOS.filter(slot => !occupiedSlots.has(slot));

        return { success: true, data: availableSlots };

    } catch (error) {
        console.error('Error in getAvailableSlots:', error);
        return { success: false, error: 'Erro interno.' };
    }
}

// Helper to check if user is admin - now accepts explicit token
const checkAdmin = async (accessToken?: string) => {
    // If no token provided, try cookies (fallback)
    if (!accessToken) {
        try {
            const supabase = await getSupabase();
            const { data: { user }, error } = await supabase.auth.getUser();
            if (user && !error) {
                // Check role for cookie-based user
                const { data: userData, error: roleError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('auth_id', user.id)
                    .single();

                if (!roleError && userData && (userData.role === 'admin' || userData.role === 'superadmin')) {
                    return { supabase, session: { user } as any };
                }
            }
        } catch (e) {
            // Ignore cookie error if we are going to fail anyway
        }
    }

    // Use token if provided
    if (accessToken) {
        // We must create a FRESH client with the token to ensure DB operations use it
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const authenticatedSupabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });

        const { data: { user }, error: authError } = await authenticatedSupabase.auth.getUser();

        if (authError || !user) {
            console.error('DEBUG: Token Validation Failed:', authError);
            throw new Error('Unauthorized: Invalid token');
        }

        // Check role in users table
        const { data: userData, error } = await authenticatedSupabase
            .from('users')
            .select('role')
            .eq('auth_id', user.id)
            .single();

        if (error || !userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
            throw new Error('Forbidden: Admin access required');
        }

        return { supabase: authenticatedSupabase, session: { user } as any };
    }

    // If we reached here, both cookie and token failed
    const cookieStore = await cookies();
    const cookieNames = cookieStore.getAll().map(c => c.name).join(', ');
    throw new Error(`Unauthorized: No valid session found. Cookies: ${cookieNames}`);
};

// Update generation to accept name AND token
export async function generateSchedulingLink(nome?: string, accessToken?: string) {
    try {
        const { supabase, session } = await checkAdmin(accessToken);

        // Generate a random token
        const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12);

        const { data, error } = await supabase
            .from('links_agendamento')
            .insert({
                token,
                nome, // Insert the name
                created_by: session.user.id
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

export async function getLinks(accessToken?: string) {
    try {
        const { supabase } = await checkAdmin(accessToken);
        const { data, error } = await supabase
            .from('links_agendamento')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('Error in getLinks:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteLink(linkId: string, accessToken?: string) {
    try {
        const { supabase } = await checkAdmin(accessToken);
        const { error } = await supabase
            .from('links_agendamento')
            .delete()
            .eq('id', linkId);

        if (error) throw error;
        revalidatePath('/admin/gestao');
        return { success: true };
    } catch (error: any) {
        console.error('Error in deleteLink:', error);
        return { success: false, error: error.message };
    }
}

export async function getPendingRequests(accessToken?: string) {
    try {
        const { supabase } = await checkAdmin(accessToken);
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

export async function approvePreScheduling(preAgendamentoId: string, scheduleData: { data: string, horario: string }, accessToken?: string) {
    try {
        const { supabase, session } = await checkAdmin(accessToken);

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
                nome: request.nome,
                cpf: request.cpf,
                telefone: request.telefone,
                data: scheduleData.data,
                horario: scheduleData.horario,
                status: 'confirmado',
                email: 'nao_informado@exemplo.com',
                data_nascimento: '2000-01-01',
                observacoes: 'Agendamento via Pré-Agendamento'
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

export async function rejectPreScheduling(preAgendamentoId: string, motivo: string, accessToken?: string) {
    try {
        const { supabase, session } = await checkAdmin(accessToken);

        if (!motivo) throw new Error('Motivo de rejeição é obrigatório');

        const { error } = await supabase
            .from('pre_agendamentos')
            .update({
                status: 'rejeitado',
                validado_em: new Date().toISOString(),
                validado_por: session.user.id,
                motivo_rejeicao: motivo
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
