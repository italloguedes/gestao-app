'use client';

import React from 'react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { 
  FiSearch, 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle, 
  FiLock, 
  FiXCircle,
  FiArrowLeft,
  FiUser,
  FiFileText,
  FiHash,
  FiPhone,
  FiCalendar,
  FiInfo
} from 'react-icons/fi';

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
          icon: <FiCheckCircle className="w-8 h-8" />,
          title: 'Documento Pronto para Retirada',
          message: 'A carteira está pronta e pode ser retirada pelos pais, avós, tios de 1º grau, ou irmãos maiores de 18 anos. É necessário apresentar documentação que comprove o vínculo familiar e documento de identificação com foto.',
          color: 'bg-teal-50 border-teal-200',
          textColor: 'text-teal-800',
          iconColor: 'text-teal-600'
        };
      case 'em_andamento':
        return {
          icon: <FiClock className="w-8 h-8" />,
          title: 'Em Processamento',
          message: 'A carteira ainda não está pronta. Se já se passaram mais de 20 dias, por favor entre em contato pelo telefone (85) 2180-6587.',
          color: 'bg-sky-50 border-sky-200',
          textColor: 'text-sky-800',
          iconColor: 'text-sky-600'
        };
      case 'correcao':
        return {
          icon: <FiAlertCircle className="w-8 h-8" />,
          title: 'Em Correção',
          message: 'Atenção, sua carteira se encontra em correção. Se já se passaram mais de 20 dias, por favor entre em contato pelo telefone (85) 2180-6587.',
          color: 'bg-amber-50 border-amber-200',
          textColor: 'text-amber-800',
          iconColor: 'text-amber-600'
        };
      case 'bloqueado':
        return {
          icon: <FiLock className="w-8 h-8" />,
          title: 'Documento Bloqueado',
          message: 'Por favor, entre em contato com o setor pelo telefone (85) 2180-6587 para mais informações sobre o bloqueio.',
          color: 'bg-slate-50 border-slate-200',
          textColor: 'text-slate-800',
          iconColor: 'text-slate-600'
        };
      case 'cancelado':
        return {
          icon: <FiXCircle className="w-8 h-8" />,
          title: 'Documento Cancelado',
          message: 'ATENÇÃO: Sua solicitação foi cancelada. Entre em contato com o setor pelo telefone (85) 2180-6587 para entender o motivo e verificar como proceder.',
          color: 'bg-rose-50 border-rose-200',
          textColor: 'text-rose-800',
          iconColor: 'text-rose-600'
        };
      default:
        return {
          icon: <FiInfo className="w-8 h-8" />,
          title: 'Status Desconhecido',
          message: 'Por favor, entre em contato com o setor pelo telefone (85) 2180-6587.',
          color: 'bg-slate-50 border-slate-200',
          textColor: 'text-slate-800',
          iconColor: 'text-slate-600'
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Consulta de Documento
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Digite seu CPF para consultar o status do seu documento
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <label htmlFor="cpf" className="block text-sm font-medium text-slate-700 mb-2">
                  CPF do Solicitante
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiHash className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="cpf"
                    value={cpf}
                    onChange={handleCPFChange}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    className="block w-full pl-11 pr-4 py-4 text-lg border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center py-4 px-6 text-lg font-medium rounded-xl text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <FiClock className="animate-spin -ml-1 mr-3 h-6 w-6" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <FiSearch className="-ml-1 mr-3 h-6 w-6" />
                    Consultar Documento
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-8 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start">
                <FiAlertCircle className="h-6 w-6 text-rose-500 mt-0.5" />
                <p className="ml-3 text-base text-rose-700">{error}</p>
              </div>
            )}

            {result && (
              <div className={`mt-8 rounded-xl border ${getStatusMessage(result.status).color}`}>
                <div className="p-6">
                  <div className="flex items-start">
                    <div className={`p-3 rounded-xl ${getStatusMessage(result.status).color} ${getStatusMessage(result.status).iconColor}`}>
                      {getStatusMessage(result.status).icon}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className={`text-xl font-semibold ${getStatusMessage(result.status).textColor}`}>
                        {getStatusMessage(result.status).title}
                      </h3>
                      
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center text-slate-700">
                          <FiUser className="w-5 h-5 text-slate-500" />
                          <span className="ml-2 text-base">{result.nome}</span>
                        </div>
                        <div className="flex items-center text-slate-700">
                          <FiFileText className="w-5 h-5 text-slate-500" />
                          <span className="ml-2 text-base">Protocolo: {result.protocolo}</span>
                        </div>
                      </div>
                      
                      <p className={`mt-4 text-base ${getStatusMessage(result.status).textColor}`}>
                        {getStatusMessage(result.status).message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
            <Link
              href="/"
              className="inline-flex items-center text-base text-sky-600 hover:text-sky-700 transition-colors duration-200"
            >
              <FiArrowLeft className="mr-2 h-5 w-5" />
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 