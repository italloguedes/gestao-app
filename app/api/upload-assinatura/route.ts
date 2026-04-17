import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Configuração do servidor incompleta');
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * POST /api/upload-assinatura
 * Recebe um arquivo multipart/form-data e faz upload para o bucket 'avatars'
 * usando o service role (ignora RLS).
 */
export async function POST(request: NextRequest) {
    try {
        const authCheck = await checkAuth(request, 'admin');
        if (!authCheck.authenticated) return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
        if (!authCheck.authorized) return forbiddenResponse(authCheck.error || 'Apenas administradores podem fazer upload');

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: 'Arquivo deve ter no máximo 2MB' }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use PNG, JPG ou WebP.' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const ext = file.name.split('.').pop() || 'png';
        const fileName = `signatures/signature-${Date.now()}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error('[upload-assinatura] Erro no upload:', uploadError);
            return NextResponse.json({ error: uploadError.message }, { status: 400 });
        }

        const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(fileName);

        return NextResponse.json({ publicUrl: data.publicUrl });
    } catch (err: any) {
        console.error('[upload-assinatura] Exceção:', err);
        return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
