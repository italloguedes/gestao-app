'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/db';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';

interface Atendimento {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  solicitante: string;
  protocolo: string;
  dia_atual: string;
  horario: string;
  status: string;
}

export default function AtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/dashboard');
      return;
    }
    fetchAtendimentos();
  }, [user, router]);

  const fetchAtendimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .order('dia_atual', { ascending: false });

      if (error) throw error;

      setAtendimentos(data || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const filteredAtendimentos = atendimentos.filter((atendimento) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      atendimento.nome.toLowerCase().includes(searchLower) ||
      atendimento.protocolo.toLowerCase().includes(searchLower) ||
      atendimento.cpf.includes(searchTerm)
    );
  });

  if (loading) return <Loading />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lista de Atendimentos</h1>
        <Link
          href="/dashboard/atendimentos/novo"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Registrar Atendimento
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, protocolo ou CPF..."
          className="w-full p-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-3 text-left">Protocolo</th>
              <th className="px-6 py-3 text-left">Nome</th>
              <th className="px-6 py-3 text-left">CPF</th>
              <th className="px-6 py-3 text-left">Data</th>
              <th className="px-6 py-3 text-left">Horário</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredAtendimentos.map((atendimento) => (
              <tr key={atendimento.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{atendimento.protocolo}</td>
                <td className="px-6 py-4">{atendimento.nome}</td>
                <td className="px-6 py-4">{atendimento.cpf}</td>
                <td className="px-6 py-4">{formatDate(atendimento.dia_atual)}</td>
                <td className="px-6 py-4">{formatTime(atendimento.horario)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      atendimento.status === 'Concluído'
                        ? 'bg-green-100 text-green-800'
                        : atendimento.status === 'Em andamento'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {atendimento.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/atendimentos/${atendimento.id}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 