'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/app/components/Loading';

interface Atendimento {
  id: string;
  nome: string;
  email: string;
  status: string;
}

export default function AtualizarCINPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [cpf, setCpf] = useState(searchParams?.get('cpf') || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!user) {
        setMessage({ text: 'Usuário não autenticado', type: 'error' });
        return;
      }

      // Buscar atendimento pelo CPF
      const { data: atendimentos, error: fetchError } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('cpf', cpf)
        .single();

      if (fetchError || !atendimentos) {
        setMessage({ text: 'Atendimento não encontrado para este CPF', type: 'error' });
        return;
      }

      const atendimento: Atendimento = atendimentos;

      if (atendimento.status === 'concluído') {
        setMessage({ text: 'Este atendimento já está concluído', type: 'error' });
        return;
      }

      // Atualizar status do atendimento
      const { error: updateError } = await supabase
        .from('atendimentos')
        .update({ status: 'concluído' })
        .eq('id', atendimento.id);

      if (updateError) {
        setMessage({ text: 'Erro ao atualizar status do atendimento', type: 'error' });
        return;
      }

      // Enviar email de conclusão
      const response = await fetch('/api/send-email-cin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: atendimento.email,
          nome: atendimento.nome,
          cpf: cpf,
        }),
      });

      if (!response.ok) {
        setMessage({ 
          text: 'Atendimento concluído, mas houve um erro ao enviar o email',
          type: 'error'
        });
        return;
      }

      setMessage({ 
        text: 'Atendimento concluído com sucesso! Email enviado.',
        type: 'success'
      });

      // Limpar formulário e redirecionar após 2 segundos
      setCpf('');
      setTimeout(() => {
        router.push('/dashboard/atendimentos');
      }, 2000);

    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao processar a solicitação', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Atualizar CIN</h1>
        <p className="text-gray-600 mt-2">Atualize o status do atendimento e envie o email de CIN pronta</p>
      </div>

      <div className="card p-6">
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">
              CPF do Atendimento
            </label>
            <input
              type="text"
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="input mt-1"
              placeholder="Digite apenas números"
              required
              autoFocus
              maxLength={11}
              pattern="[0-9]{11}"
              title="Digite um CPF válido com 11 dígitos numéricos"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? <Loading /> : 'Atualizar CIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 