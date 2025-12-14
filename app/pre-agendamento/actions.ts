'use server';

import { supabaseServer } from '@/lib/supabase-server';

export async function validateToken(token: string) {
    try {
        const { data, error } = await supabaseServer
            .from('links_agendamento')
            .select('id, ativo')
            .eq('token', token)
            .single();

        if (error || !data || !data.ativo) {
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

        const { error: uploadError } = await supabaseServer
            .storage
            .from('certidoes') // Ensure this bucket exists!
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return { success: false, error: 'Erro ao fazer upload da certidão. Verifique se o formato é válido.' };
        }

        // Get Public URL
        const { data: { publicUrl } } = supabaseServer
            .storage
            .from('certidoes')
            .getPublicUrl(filePath);

        // 3. Insert Record
        const { error: insertError } = await supabaseServer
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
