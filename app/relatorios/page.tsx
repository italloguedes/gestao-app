'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

// Tipo básico para os atendimentos
interface Atendimento {
  id: string;
  nome: string;
  cpf: string;
  dia_atual: string;
  usuario_id: string;
}

export default function Relatorios() {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [resultados, setResultados] = useState<Atendimento[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pega o ID do usuário logado
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redireciona se não estiver logado
      } else {
        setUserId(session.user.id);
      }
    };
    fetchUser();
  }, [router]);

  // Função simples para buscar atendimentos
  const buscarAtendimentos = async () => {
    if (!userId) {
      setMensagem('Usuário não carregado ainda. Tente novamente.');
      return;
    }

    setMensagem(null);
    setResultados([]);
    setLoading(true);

    if (!dataInicio || !dataFim) {
      setMensagem('Selecione as datas inicial e final.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('id, nome, cpf, dia_atual, usuario_id')
        .eq('usuario_id', userId)
        .gte('dia_atual', dataInicio)
        .lte('dia_atual', dataFim)
        .order('dia_atual', { ascending: true });

      if (error) {
        setMensagem('Erro ao buscar: ' + error.message);
      } else if (!data || data.length === 0) {
        setMensagem('Nenhum atendimento encontrado.');
      } else {
        setResultados(data);
      }
    } catch (err) {
      setMensagem('Erro inesperado. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pt-20">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Relatórios</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Data Inicial
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1 w-full p-2 border rounded"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Data Final
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1 w-full p-2 border rounded"
              disabled={loading}
            />
          </div>
        </div>

        <button
          onClick={buscarAtendimentos}
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>

        {mensagem && (
          <p className="mt-4 text-red-500">{mensagem}</p>
        )}

        {resultados.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">
              Resultados ({resultados.length})
            </h2>
            <table className="min-w-full border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left border-b">Nome</th>
                  <th className="p-2 text-left border-b">CPF</th>
                  <th className="p-2 text-left border-b">Data</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((atendimento) => (
                  <tr key={atendimento.id} className="border-b">
                    <td className="p-2">{atendimento.nome}</td>
                    <td className="p-2">{atendimento.cpf}</td>
                    <td className="p-2">
                      {new Date(atendimento.dia_atual).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 w-full p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          disabled={loading}
        >
          Voltar
        </button>
      </div>
    </div>
  );
}