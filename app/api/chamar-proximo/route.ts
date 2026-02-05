import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { checkAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/apiAuth';

// Configuração de runtime para Vercel
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Verificar autenticação e permissões (requer atendente, admin ou superadmin)
        const authCheck = await checkAuth(request, 'atendente');

        if (!authCheck.authenticated) {
            return unauthorizedResponse(authCheck.error || 'Autenticação necessária');
        }

        if (!authCheck.authorized) {
            return forbiddenResponse(authCheck.error || 'Apenas atendentes e administradores podem chamar próximo');
        }

        const supabase = createRouteHandlerClient({ cookies });

        // Get the user session for the RPC call
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 401 });
        }

        // Call the stored procedure to get the next person safely
        const { data, error } = await supabase
            .rpc('chamar_proximo', {
                p_atendente_id: session.user.id
            });

        if (error) {
            console.error('Error calling next person:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ message: 'Ninguém na fila' }, { status: 404 });
        }

        // The RPC returns an array, take the first item
        const nextPerson = data[0];

        // UPDATE IDENTITY: Ensure atendente_nome is set from Auth metadata
        // avoiding dependency on public.users table or triggers
        try {
            const atendenteNome = session.user.user_metadata?.name ||
                session.user.user_metadata?.full_name ||
                'Atendente';

            // RPC chama 'chamar_proximo' que retorna SETOF agendamentos.
            // Portanto a tabela é 'agendamentos'.
            await supabase
                .from('agendamentos')
                .update({ atendente_nome: atendenteNome })
                .eq('id', nextPerson.id);

            // Update the local object to return correctly
            nextPerson.atendente_nome = atendenteNome;

        } catch (updateError) {
            console.error('Error updating attendant name:', updateError);
            // Don't fail the request, just log
        }

        return NextResponse.json({
            success: true,
            data: nextPerson
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
