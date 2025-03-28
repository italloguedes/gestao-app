'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CadastrarAtendimento() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      } else {
        setUserId(session.user.id);
      }
    };
    checkUser();
  }, [router]);

  const isValidCpf = (cpf: string) => {
    return /^[0-9]{11}$/.test(cpf);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
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
      { nome, cpf, email, solicitante, horario, dia_atual: diaAtual, usuario_id: userId, protocolo }
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
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setMessage('Atendimento cadastrado, mas erro ao enviar e-mail: ' + result.error);
      }
    } catch (emailError) {
      setMessage('Atendimento cadastrado, mas houve erro ao enviar o e-mail.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-300 via-blue-200 to-purple-300 flex items-center justify-center p-6">
      <header className="bg-white shadow-xl rounded-lg w-full max-w-md p-4 text-center mb-8">
        <h1 className="text-3xl font-semibold text-gray-800">Cadastrar Atendimento</h1>
      </header>
      <main className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-medium text-gray-700 text-center">Novo Atendimento</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col">
            <input 
              type="text" 
              placeholder="Nome" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              required 
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-400" 
            />
            <input 
              type="text" 
              placeholder="CPF" 
              value={cpf} 
              onChange={(e) => setCpf(e.target.value)} 
              required 
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-400" 
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-400" 
            />
            <input 
              type="text" 
              placeholder="Solicitante" 
              value={solicitante} 
              onChange={(e) => setSolicitante(e.target.value)} 
              required 
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-400" 
            />
          </div>
          <button 
            type="submit" 
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="w-full mt-4 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Voltar
        </button>
        {message && <p className={`mt-4 text-center ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </main>
      <footer className="bg-gray-800 text-white py-4 w-full text-center mt-6">
        <p>© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
