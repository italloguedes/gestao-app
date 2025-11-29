import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });

        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        return NextResponse.json({
            success: true,
            data: nextPerson
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
