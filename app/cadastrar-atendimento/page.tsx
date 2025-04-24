'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';

export default function CadastrarAtendimentoPage() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  const isValidCpf = (cpf: string) => {
    return /^[0-9]{11}$/.test(cpf);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage('Usuário não autenticado.');
      return;
    }
    if (!isValidCpf(cpf)) {
      setMessage('CPF inválido. Use apenas números, sem pontos ou traços.');
      return;
    }
    setLoading(true);

    const now = new Date();
    const diaAtual = now.toISOString().split('T')[0];
    const horario = now.toTimeString().split(' ')[0];

    const { data: protocolData, error: protocolError } = await supabase.rpc('generate_protocolo');
    if (protocolError) {
      setMessage('Erro ao gerar número de protocolo: ' + protocolError.message);
      setLoading(false);
      return;
    }

    const protocolo = protocolData;
    const { error } = await supabase.from('atendimentos').insert([
      { 
        nome, 
        cpf, 
        email, 
        solicitante, 
        horario, 
        dia_atual: diaAtual, 
        usuario_id: user.id, 
        protocolo,
        status: 'Pendente'
      }
    ]);

    if (error) {
      setMessage('Erro ao cadastrar atendimento: ' + error.message);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, nome, cpf, protocolo })
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Atendimento cadastrado com sucesso! E-mail enviado.');
        setTimeout(() => router.push('/consultar-atendimentos'), 2000);
      } else {
        setMessage('Atendimento cadastrado, mas erro ao enviar e-mail: ' + result.error);
      }
    } catch (emailError) {
      setMessage('Atendimento cadastrado, mas houve erro ao enviar o e-mail.');
    }

    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Cadastrar Novo Atendimento</h1>

        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.includes('sucesso') 
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
              Nome do Cliente
            </label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Nome completo do cliente"
              required
              minLength={3}
            />
          </div>

          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">
              CPF
            </label>
            <input
              type="text"
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Apenas números"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="email@exemplo.com"
              required
            />
          </div>

          <div>
            <label htmlFor="solicitante" className="block text-sm font-medium text-gray-700">
              Solicitante
            </label>
            <input
              type="text"
              id="solicitante"
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Nome do solicitante"
              required
              minLength={3}
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? <Loading /> : 'Cadastrar Atendimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 