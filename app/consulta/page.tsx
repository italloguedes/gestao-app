'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';

interface ConsultaResult {
  status: string;
  protocolo: string;
  nome: string;
}

export default function ConsultaPage() {
  const [cpf, setCpf] = useState('');
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const removeCPFFormatting = (cpf: string) => {
    return cpf.replace(/\D/g, '');
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedCPF = formatCPF(value);
    setCpf(formattedCPF);
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'Concluído':
        return {
          title: 'Documento Pronto para Retirada',
          message: 'A carteira está pronta e pode ser retirada pelos pais, avós, tios de 1º grau, ou irmãos maiores de 18 anos. É necessário apresentar documentação que comprove o vínculo familiar e documento de identificação com foto.',
          color: 'bg-green-50 text-green-800 border-green-200'
        };
      case 'em_andamento':
        return {
          title: 'Em Processamento',
          message: 'A carteira ainda não está pronta. Se já se passaram mais de 20 dias, por favor entre em contato pelo telefone (85) 2180-6587.',
          color: 'bg-yellow-50 text-yellow-800 border-yellow-200'
        };
      case 'correcao':
        return {
          title: 'Em Correção',
          message: 'Atenção, sua carteira se encontra em correção. Se já se passaram mais de 20 dias, por favor entre em contato pelo telefone (85) 2180-6587.',
          color: 'bg-red-50 text-red-800 border-red-200'
        };
      case 'bloqueado':
        return {
          title: 'Documento Bloqueado',
          message: 'Por favor, entre em contato com o setor pelo telefone (85) 2180-6587 para mais informações sobre o bloqueio.',
          color: 'bg-orange-50 text-orange-800 border-orange-200'
        };
      case 'cancelado':
        return {
          title: 'Documento Cancelado',
          message: 'ATENÇÃO: Sua solicitação foi cancelada. Entre em contato com o setor pelo telefone (85) 2180-6587 para entender o motivo e verificar como proceder.',
          color: 'bg-red-100 text-red-900 border-red-300'
        };
      default:
        return {
          title: 'Status Desconhecido',
          message: 'Por favor, entre em contato com o setor pelo telefone (85) 2180-6587.',
          color: 'bg-gray-50 text-gray-800 border-gray-200'
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const unformattedCPF = removeCPFFormatting(cpf);
    
    if (!unformattedCPF || unformattedCPF.length !== 11) {
      setError('Por favor, insira um CPF válido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const { data, error: queryError } = await supabase
        .from('atendimentos')
        .select('status, protocolo, nome')
        .eq('cpf', unformattedCPF)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          setError('Nenhum atendimento encontrado para este CPF');
        } else {
          throw queryError;
        }
        return;
      }

      setResult(data as ConsultaResult);
    } catch (err) {
      setError('Erro ao realizar consulta. Tente novamente mais tarde.');
      console.error('Erro na consulta:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Consulta de Documento</h1>
          <p className="mt-2 text-gray-600">
            Digite seu CPF para consultar o status do seu documento
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">
                CPF
              </label>
              <input
                type="text"
                id="cpf"
                value={cpf}
                onChange={handleCPFChange}
                maxLength={14}
                placeholder="000.000.000-00"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Consultando...' : 'Consultar'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className={`mt-6 p-4 border rounded-md ${getStatusMessage(result.status).color}`}>
              <h3 className="text-lg font-medium">{getStatusMessage(result.status).title}</h3>
              <p className="mt-1 text-sm">Protocolo: {result.protocolo}</p>
              <p className="mt-1 text-sm">Nome: {result.nome}</p>
              <p className="mt-2 text-sm">{getStatusMessage(result.status).message}</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 