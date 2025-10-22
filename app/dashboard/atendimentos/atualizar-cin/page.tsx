'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/app/components/Loading';

function AtualizarCINForm() {
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

      // Formatar o CPF removendo caracteres não numéricos
      const cpfLimpo = cpf.replace(/\D/g, '');

      console.log('Buscando atendimento para CPF:', cpfLimpo);

      // Buscar atendimento pelo CPF
      const { data: atendimentos, error: fetchError } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('cpf', cpfLimpo)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('Resultado da busca:', { atendimentos, fetchError });

      if (fetchError) {
        console.error('Erro ao buscar atendimento:', fetchError);
        setMessage({ text: 'Erro ao buscar atendimento: ' + fetchError.message, type: 'error' });
        return;
      }

      if (!atendimentos || atendimentos.length === 0) {
        setMessage({ text: 'Atendimento não encontrado para este CPF', type: 'error' });
        return;
      }

      const atendimento = atendimentos[0];

      if (atendimento.status === 'Concluído') {
        setMessage({ text: 'Este atendimento já está concluído', type: 'error' });
        return;
      }

      console.log('Atualizando status do atendimento:', atendimento.id);

      // Atualizar status do atendimento
      const { error: updateError } = await supabase
        .from('atendimentos')
        .update({ status: 'Concluído' })
        .eq('id', atendimento.id);

      if (updateError) {
        console.error('Erro ao atualizar status:', updateError);
        setMessage({ text: 'Erro ao atualizar status do atendimento: ' + updateError.message, type: 'error' });
        return;
      }

      console.log('Status atualizado, enviando email...');

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();

      // Enviar email de conclusão
      const response = await fetch('/api/cin-pronta', {  // Ajustando para a rota correta /api/cin-pronta
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          to: atendimento.email,
          nome: atendimento.nome,
          cpf: atendimento.cpf,
        }),
      });

      const emailResult = await response.json();

      if (!response.ok) {
        console.error('Erro ao enviar email:', emailResult);
        setMessage({ 
          text: 'Atendimento concluído, mas houve um erro ao enviar o email: ' + emailResult.error,
          type: 'error'
        });
        return;
      }

      console.log('Email enviado com sucesso');
      setMessage({ 
        text: 'Atendimento concluído com sucesso! Email enviado.',
        type: 'success'
      });

      // Limpar formulário e redirecionar após 2 segundos
      setCpf('');
      setTimeout(() => {
        router.push('/dashboard/atendimentos/atualizar-cin');
      }, 500);

    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      setMessage({ text: 'Erro ao processar a solicitação: ' + (error as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <p className="mt-1 text-sm text-gray-500">Digite apenas os números do CPF, sem pontos ou traços</p>
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
  );
}

export default function AtualizarCINPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Atualizar CIN</h1>
        <p className="text-gray-600 mt-2">Atualize o status do atendimento e envie o email de CIN pronta</p>
      </div>

      <Suspense fallback={<Loading />}>
        <AtualizarCINForm />
      </Suspense>
    </div>
  );
}
