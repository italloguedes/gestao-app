"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/app/components/Loading';

interface Atendimento {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  protocolo: string;
  dia_atual: string;
  status: string;
}

export default function AtendimentosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const recordsPerPage = 50;

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      fetchAtendimentos();
    }
  }, [user, router, currentPage, searchTerm]);

  const fetchAtendimentos = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('atendimentos')
        .select('*', { count: 'exact' });

      // Aplicar filtros de busca se houver termo de busca
      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,protocolo.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`);
      }

      // Primeiro, obter a contagem total com os filtros aplicados
      const { count, error: countError } = await query;

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Então buscar os dados paginados com os mesmos filtros
      const { data, error } = await query
        .order('dia_atual', { ascending: false })
        .range((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage - 1);

      if (error) throw error;
      setAtendimentos(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar atendimentos:', error);
      setMessage('Erro ao carregar atendimentos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / recordsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Remover o filtro local já que agora é feito no servidor
  const filteredAtendimentos = atendimentos;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Atendimentos</h1>
          <p className="text-gray-600 mt-2">Cadastre e atualize atendimentos</p>
        </div>
        <Link 
          href="/dashboard/atendimentos/novo"
          className="btn-primary"
        >
          Cadastrar Atendimento
        </Link>
      </div>

      <div className="card p-6">
        {message && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{message}</p>
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou protocolo..."
            className="input w-full max-w-md"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Resetar para primeira página ao buscar
            }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">CPF</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Cliente</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">E-mail</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Data</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="py-3 px-4 text-right text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-4">
                    <Loading />
                  </td>
                </tr>
              ) : filteredAtendimentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">
                    {searchTerm 
                      ? 'Nenhum atendimento encontrado para a busca realizada'
                      : 'Nenhum atendimento cadastrado'}
                  </td>
                </tr>
              ) : (
                filteredAtendimentos.map((atendimento) => (
                  <tr key={atendimento.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{atendimento.cpf}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{atendimento.nome}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{atendimento.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatDate(atendimento.dia_atual)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        atendimento.status === 'concluído' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {atendimento.status === 'concluído' ? 'Concluído' : 'Em Andamento'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {atendimento.status !== 'concluído' && (
                        <button 
                          onClick={() => router.push(`/dashboard/atendimentos/atualizar-cin?cpf=${atendimento.cpf}`)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Atualizar CIN
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{filteredAtendimentos.length}</span> de{' '}
            <span className="font-medium">{totalCount}</span> atendimentos
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Anterior
            </button>
            <span className="text-sm text-gray-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 