'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export default function DebugAuthPage() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };
        checkSession();
    }, []);

    if (loading) {
        return <div className="p-8">Carregando...</div>;
    }

    if (!session) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Não autenticado</h1>
                <a href="/" className="text-blue-600 underline">Fazer login</a>
            </div>
        );
    }

    const user = session.user;
    const userMetadata = user.user_metadata || {};
    const detectedRole = userMetadata.role || 'NÃO DEFINIDO';

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">🔍 Debug de Autenticação</h1>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">📧 Informações do Usuário</h2>
                <div className="space-y-2 text-sm">
                    <p><strong>ID:</strong> {user.id}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Provider:</strong> {user.app_metadata?.provider || 'N/A'}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">🎭 Role Detectada</h2>
                <div className={`text-2xl font-bold ${detectedRole === 'NÃO DEFINIDO' ? 'text-red-600' : 'text-green-600'}`}>
                    {detectedRole}
                </div>
                {detectedRole === 'NÃO DEFINIDO' && (
                    <p className="text-red-500 mt-2 text-sm">
                        ⚠️ O campo "role" não existe no user_metadata. Isso explica porque o redirect não funciona!
                    </p>
                )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">📦 user_metadata (completo)</h2>
                <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                    {JSON.stringify(userMetadata, null, 2)}
                </pre>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">🔐 app_metadata</h2>
                <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                    {JSON.stringify(user.app_metadata || {}, null, 2)}
                </pre>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">🛠️ Como corrigir</h2>
                <p className="text-sm mb-4">Execute este SQL no Supabase (SQL Editor):</p>
                <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-auto text-xs">
                    {`UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "superadmin"}'::jsonb
WHERE email = '${user.email}';`}
                </pre>
                <p className="text-sm text-gray-500 mt-2">
                    Troque "superadmin" pela role desejada: admin, atendente, recepcao, user
                </p>
            </div>
        </div>
    );
}
