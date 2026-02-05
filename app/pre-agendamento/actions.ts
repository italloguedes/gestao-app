'use server';

import { createClient } from '@supabase/supabase-js';

// Use Anon Key for public actions (relies on RLS)
const getPublicSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey);
};

export async function validateToken(token: string) {
    try {
        const supabase = getPublicSupabase();
        const { data, error } = await supabase
            .from('links_agendamento')
            .select('id, ativo')
            .eq('token', token)
            .single();

        if (error || !data || !data.ativo) {
            console.error('Validation error:', error);
            return { valid: false };
        }

        return { valid: true, linkId: data.id };
    } catch (error) {
        console.error('Error validating token:', error);
        return { valid: false };
    }
}

export async function submitPreAgendamento(formData: FormData) {
    try {
        const supabase = getPublicSupabase();
        const token = formData.get('token') as string;
        const nome = formData.get('nome') as string;
        const cpf = formData.get('cpf') as string;
        const telefone = formData.get('telefone') as string;
        const file = formData.get('certidao') as File;

        if (!token || !nome || !cpf || !telefone || !file) {
            return { success: false, error: 'Dados incompletos' };
        }

        // 1. Validate Token again
        const { valid, linkId } = await validateToken(token);
        if (!valid || !linkId) {
            return { success: false, error: 'Link inválido ou expirado' };
        }

        // 2. Upload File
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
        const filePath = `certidoes/${fileName}`;

        // Convert File to ArrayBuffer/Buffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase
            .storage
            .from('certidoes')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return { success: false, error: 'Erro ao fazer upload da certidão. Verifique se o formato é válido.' };
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('certidoes')
            .getPublicUrl(filePath);

        // 3. Insert Record
        const { error: insertError } = await supabase
            .from('pre_agendamentos')
            .insert({
                link_id: linkId,
                nome,
                cpf,
                telefone,
                certidao_url: publicUrl,
                status: 'pendente'
            });

        if (insertError) {
            console.error('Insert error:', insertError);
            return { success: false, error: 'Erro ao salvar solicitação.' };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error in submitPreAgendamento:', error);
        return { success: false, error: error.message || 'Erro interno no servidor' };
    }
}

export async function checkPreSchedulingStatus(token: string, cpf: string) {
    try {
        const supabase = getPublicSupabase();

        // 1. Validate Token to get Link ID
        const { valid, linkId } = await validateToken(token);
        if (!valid || !linkId) {
            return { success: false, error: 'Link inválido' };
        }

        // 2. Search for request with this CPF and Link ID
        const { data, error } = await supabase
            .from('pre_agendamentos')
            .select('status, motivo_rejeicao, created_at, nome')
            .eq('link_id', linkId)
            .eq('cpf', cpf)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return { success: false, error: 'Solicitação não encontrada para este CPF neste link.' };
        }

        return {
            success: true,
            data: {
                status: data.status,
                motivo_rejeicao: data.motivo_rejeicao,
                created_at: data.created_at,
                nome: data.nome
            }
        };

    } catch (error: any) {
        console.error('Error checking status:', error);
        return { success: false, error: 'Erro ao consultar status.' };
    }
}

export async function getPublicRequests(token: string) {
    try {
        const supabase = getPublicSupabase();


        // 1. Validate Token
        const { valid, linkId } = await validateToken(token);
        if (!valid || !linkId) {
            return { success: false, error: 'Link inválido' };
        }

        // 2. Fetch requests
        const { data, error } = await supabase
            .from('pre_agendamentos')
            .select('nome, cpf, status, motivo_rejeicao, created_at')
            .eq('link_id', linkId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 3. Mask sensitive data
        const publicData = data.map(req => ({
            nome: req.nome,
            cpf: req.cpf.replace(/\d{3}\.\d{3}\./, '***.***.'), // Mask first 6 digits
            status: req.status,
            motivo: req.status === 'rejeitado' ? req.motivo_rejeicao : null,
            created_at: req.created_at
        }));

        return { success: true, data: publicData };

    } catch (error: any) {
        console.error('Error fetching public requests:', error);
        return { success: false, error: 'Erro ao carregar lista.' };
    }
}
