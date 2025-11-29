import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export interface AgendamentoChamada {
    id: number;
    nome: string;
    senha: number;
    tipo: 'normal' | 'preferencial';
    status: string;
    cpf?: string;
    email?: string;
    telefone?: string;
    horario: string;
    data: string;
    atendimento_preferencial?: boolean;
    [key: string]: any;
}

export function useCallSystem() {
    const [loading, setLoading] = useState(false);
    const [currentCall, setCurrentCall] = useState<AgendamentoChamada | null>(null);

    const callNext = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/chamar-proximo', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Erro ao chamar próximo');
            }

            setCurrentCall(data.data);
            return data.data;
        } catch (error: any) {
            console.error('Erro ao chamar:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return {
        callNext,
        loading,
        currentCall,
        setCurrentCall
    };
}
