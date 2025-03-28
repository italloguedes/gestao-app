'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

// Interface para os dados de atendimento
interface Atendimento {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  dia_atual: string;
  usuario_id: string;
}

export default function CadastrarCIN() {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Obtém o ID do usuário logado
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redireciona para login se não estiver logado
      } else {
        setUserId(session.user.id);
      }
    };
    fetchUser();
  }, [router]);

  const handleCadastrarCIN = async () => {
    setMensagem(null);
    setLoading(true);

    if (!userId) {
      setMensagem('Usuário não autenticado. Faça login novamente.');
      setLoading(false);
      return;
    }

    if (!cpf) {
      setMensagem('Por favor, insira o CPF.');
      setLoading(false);
      return;
    }

    try {
      // Busca nome e e-mail na tabela atendimentos
      const { data: atendimento, error: erroAtendimento } = await supabase
        .from('atendimentos')
        .select('nome, email')
        .eq('cpf', cpf)
        .single();

      if (erroAtendimento || !atendimento) {
        setMensagem('CPF não encontrado na tabela de atendimentos.');
        setLoading(false);
        return;
      }

      const nome = atendimento.nome;
      const email = atendimento.email;
      if (!email) {
        setMensagem('Nenhum e-mail associado a este CPF.');
        setLoading(false);
        return;
      }

      // Cadastra a CIN na tabela cins
      const { error: erroCadastro } = await supabase
        .from('cins')
        .insert({
          nome,
          cpf,
          status: 'pronta',
        });

      if (erroCadastro) {
        setMensagem('Erro ao cadastrar a CIN: ' + erroCadastro.message);
        setLoading(false);
        return;
      }

      // Envia o e-mail
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, nome, cpf }),
      });

      const result = await response.json();
      if (!response.ok) {
        setMensagem('CIN cadastrada, mas erro ao enviar o e-mail: ' + result.error);
        setLoading(false);
        return;
      }

      setMensagem('CIN cadastrada com sucesso! E-mail enviado para ' + email + '.');
    } catch (err) {
      setMensagem('Erro ao processar a solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-gray-900 fixed top-0 left-0 w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <h1 className="text-lg font-medium text-white">
                Gestão de Atendimentos e CIN - Sala Sensorial
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/consultar-atendimentos')}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Consulta
              </button>
              <button
                onClick={() => router.push('/cadastrar-atendimento')}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Cadastro de Atendimento
              </button>
              <button
                onClick={() => router.push('/cadastrar-cin')}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Cadastro CINS
              </button>
              <button
                onClick={() => router.push('/relatorios')}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Relatórios
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/');
                }}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo da página */}
      <div className="pt-20 px-4">
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Cadastrar CIN</h1>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">CPF</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="Digite o CPF"
              className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleCadastrarCIN}
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={loading}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar CIN'}
          </button>

          {mensagem && (
            <p
              className={`mt-4 ${
                mensagem.includes('Erro') ? 'text-red-500' : 'text-green-500'
              }`}
            >
              {mensagem}
            </p>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 w-full p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}