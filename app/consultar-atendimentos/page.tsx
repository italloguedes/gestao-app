// app/consultar-atendimentos/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Definição do tipo para os dados de atendimento
interface Atendimento {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  solicitante: string;
  horario: string;
  dia_atual: string;
  usuario_id: string;
  created_at: string;
  updated_at: string;
  protocolo: string;
}

export default function ConsultarAtendimentos() {
  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState<Atendimento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const buscarAtendimentos = async () => {
    const termo = termoBusca.trim();
    if (!termo) {
      setErro('Por favor, digite um nome ou CPF para buscar.');
      return;
    }

    setCarregando(true);
    setErro(null);
    setResultados([]);

    // Obtém o ID do usuário logado
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user.id;

    if (!userId) {
      setErro('Usuário não autenticado.');
      setCarregando(false);
      return;
    }

    // Formata o termo para buscar no CPF (remove caracteres não numéricos)
    const termoFormatadoCPF = termo.replace(/\D/g, '');

    // Busca atendimentos do usuário logado, por nome ou CPF
    const { data, error } = await supabase
      .from('atendimentos')
      .select('*')
      .eq('usuario_id', userId) // Filtra pelo usuário logado
      .or(
        `cpf.ilike.%${termoFormatadoCPF}%,nome.ilike.%${termo}%`
      );

    if (error) {
      setErro('Erro ao buscar atendimentos. Tente novamente mais tarde.');
      console.error('Erro na busca:', error);
    } else if (!data || data.length === 0) {
      setErro('Nenhum atendimento encontrado para este nome ou CPF.');
    } else {
      setResultados(data);
    }

    setCarregando(false);
  };

  // Função para formatar a data
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Função para formatar o CPF
  const formatarCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-10">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Consultar Atendimentos
        </h1>

        {/* Campo de busca */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Digite parte do Nome ou CPF"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={buscarAtendimentos}
            disabled={carregando}
            className="mt-3 w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? 'Buscando...' : 'Buscar Atendimentos'}
          </button>
        </div>

        {/* Mensagem de erro */}
        {erro && (
          <p className="text-red-500 text-center mb-4">{erro}</p>
        )}

        {/* Resultados */}
        {resultados.length > 0 && (
          <div className="space-y-4">
            {resultados.map((atendimento) => (
              <div
                key={atendimento.id}
                className="p-6 bg-gray-50 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {atendimento.nome}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                  <p>
                    <strong>CPF:</strong> {formatarCPF(atendimento.cpf)}
                  </p>
                  <p>
                    <strong>Email:</strong> {atendimento.email}
                  </p>
                  <p>
                    <strong>Solicitante:</strong> {atendimento.solicitante}
                  </p>
                  <p>
                    <strong>Data:</strong> {formatarData(atendimento.dia_atual)}
                  </p>
                  <p>
                    <strong>Horário:</strong> {atendimento.horario}
                  </p>
                  <p>
                    <strong>Protocolo:</strong> {atendimento.protocolo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botão Voltar */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 w-full p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Voltar para o Dashboard
        </button>
      </div>
    </div>
  );
}