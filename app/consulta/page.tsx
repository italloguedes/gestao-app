'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import Image from 'next/image';
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
  FiInfo,
  FiLoader,
  FiMapPin,
  FiCalendar,
  FiShield
} from 'react-icons/fi';

interface ConsultaResult {
  status: string;
  protocolo: string;
  nome: string;
  created_at?: string;
  dia_atual?: string;
}

export default function ConsultaPage() {
  const [cpf, setCpf] = useState('');
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
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

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluído':
      case 'concluido':
        return {
          icon: <FiCheckCircle className="w-16 h-16" />,
          title: 'Documento Pronto!',
          subtitle: 'Disponível para Retirada',
          message: 'Sua Carteira de Identidade Nacional está pronta e pode ser retirada.',
          instructions: [
            'Documento disponível na Sala Sensorial - ALECE',
            'Pode ser retirado por: pais, avós, tios de 1º grau ou irmãos maiores de 18 anos',
            'Necessário apresentar documento que comprove o vínculo familiar',
            'Trazer documento de identificação com foto'
          ],
          gradient: 'from-emerald-500 to-teal-600',
          bgGradient: 'from-emerald-50/50 to-teal-50/50',
          borderColor: 'border-emerald-200',
          textColor: 'text-emerald-900',
          iconColor: 'text-emerald-600',
          iconBg: 'bg-emerald-100',
          badge: 'bg-emerald-100 text-emerald-700 border-emerald-200'
        };
      case 'em_andamento':
        return {
          icon: <FiClock className="w-16 h-16" />,
          title: 'Em Processamento',
          subtitle: 'Aguarde o Prazo de Entrega',
          message: 'Seu documento está sendo processado pela Polícia Federal.',
          instructions: [
            'Prazo normal de entrega: até 20 dias úteis',
            'Acompanhe o status regularmente por esta página',
            'Você receberá um email quando o documento estiver pronto',
            'Após 20 dias sem retorno, entre em contato: (85) 2180-6587'
          ],
          gradient: 'from-blue-500 to-indigo-600',
          bgGradient: 'from-blue-50/50 to-indigo-50/50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-900',
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100',
          badge: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'correcao':
      case 'correção':
        return {
          icon: <FiAlertCircle className="w-16 h-16" />,
          title: 'Em Correção',
          subtitle: 'Atenção Necessária',
          message: 'Seu documento precisa de correções antes de ser finalizado.',
          instructions: [
            'Entre em contato com a Sala Sensorial o quanto antes',
            'Telefone para contato: (85) 2180-6587',
            'Verifique se todos os documentos estão corretos',
            'Pode ser necessário comparecer presencialmente'
          ],
          gradient: 'from-amber-500 to-orange-600',
          bgGradient: 'from-amber-50/50 to-orange-50/50',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-900',
          iconColor: 'text-amber-600',
          iconBg: 'bg-amber-100',
          badge: 'bg-amber-100 text-amber-700 border-amber-200'
        };
      case 'bloqueado':
        return {
          icon: <FiLock className="w-16 h-16" />,
          title: 'Documento Bloqueado',
          subtitle: 'Entre em Contato',
          message: 'Este documento foi bloqueado. É necessário entrar em contato com o setor.',
          instructions: [
            'Entre em contato urgentemente: (85) 2180-6587',
            'Informe seu número de protocolo',
            'Verifique os motivos do bloqueio',
            'Siga as orientações da equipe de atendimento'
          ],
          gradient: 'from-slate-600 to-gray-700',
          bgGradient: 'from-slate-50/50 to-gray-50/50',
          borderColor: 'border-slate-200',
          textColor: 'text-slate-900',
          iconColor: 'text-slate-600',
          iconBg: 'bg-slate-100',
          badge: 'bg-slate-100 text-slate-700 border-slate-200'
        };
      case 'cancelado':
        return {
          icon: <FiXCircle className="w-16 h-16" />,
          title: 'Solicitação Cancelada',
          subtitle: 'Ação Necessária',
          message: 'Sua solicitação foi cancelada. Entre em contato para entender o motivo.',
          instructions: [
            'Ligue imediatamente: (85) 2180-6587',
            'Tenha em mãos seu CPF e protocolo',
            'Entenda o motivo do cancelamento',
            'Verifique a possibilidade de nova solicitação'
          ],
          gradient: 'from-rose-500 to-red-600',
          bgGradient: 'from-rose-50/50 to-red-50/50',
          borderColor: 'border-rose-200',
          textColor: 'text-rose-900',
          iconColor: 'text-rose-600',
          iconBg: 'bg-rose-100',
          badge: 'bg-rose-100 text-rose-700 border-rose-200'
        };
      default:
        return {
          icon: <FiInfo className="w-16 h-16" />,
          title: 'Status Desconhecido',
          subtitle: 'Entre em Contato',
          message: 'Status do documento não identificado. Entre em contato com o setor.',
          instructions: [
            'Ligue: (85) 2180-6587',
            'Informe seu CPF e protocolo',
            'Solicite informações sobre o status atual'
          ],
          gradient: 'from-slate-500 to-gray-600',
          bgGradient: 'from-slate-50/50 to-gray-50/50',
          borderColor: 'border-slate-200',
          textColor: 'text-slate-900',
          iconColor: 'text-slate-600',
          iconBg: 'bg-slate-100',
          badge: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const unformattedCPF = removeCPFFormatting(cpf);

    if (!unformattedCPF || unformattedCPF.length !== 11) {
      setError('Por favor, insira um CPF válido com 11 dígitos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const { data, error: queryError } = await supabase
        .from('atendimentos')
        .select('status, protocolo, nome, created_at, dia_atual')
        .eq('cpf', unformattedCPF)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          setError('Nenhum atendimento encontrado para este CPF. Verifique se o CPF está correto.');
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

  const statusConfig = result ? getStatusConfig(result.status) : null;

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[100px] mix-blend-multiply animate-blob" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-2000" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-pink-200/30 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 min-h-screen flex flex-col justify-center">

        {/* Header Section */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center p-3 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 mb-6 ring-1 ring-slate-200/50">
            <Image
              src="/logoautismo.png"
              alt="Logo ALECE"
              width={60}
              height={60}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Consulta de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">CIN</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto leading-relaxed">
            Acompanhe o status da sua Carteira de Identidade Nacional de forma simples e rápida.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden transition-all duration-300 hover:shadow-blue-900/5 ring-1 ring-slate-900/5">
          <div className="p-6 sm:p-10">

            {/* Search Form */}
            <form onSubmit={handleSubmit} className="relative z-20">
              <div className="form-group">
                <label htmlFor="cpf" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                  CPF do Solicitante
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiHash className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                  </div>
                  <input
                    type="text"
                    id="cpf"
                    value={cpf}
                    onChange={handleCPFChange}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    className="block w-full pl-11 pr-4 py-4 text-lg bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 placeholder:text-slate-300 text-slate-900 font-medium shadow-sm group-hover:border-blue-300"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full flex items-center justify-center py-4 px-6 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 font-bold text-lg shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <FiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <FiSearch className="-ml-1 mr-2 h-5 w-5" />
                    Consultar Status
                  </>
                )}
              </button>
            </form>

            {/* Error Message */}
            {error && (
              <div className="mt-8 p-4 bg-rose-50/80 backdrop-blur-sm border border-rose-100 rounded-2xl flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
                <FiAlertCircle className="h-6 w-6 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-rose-800">Erro na Consulta</h3>
                  <p className="text-sm text-rose-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Result Section */}
            {result && statusConfig && (
              <div className="mt-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className={`rounded-3xl border ${statusConfig.borderColor} bg-gradient-to-br ${statusConfig.bgGradient} overflow-hidden shadow-sm`}>

                  {/* Status Header */}
                  <div className={`bg-gradient-to-r ${statusConfig.gradient} p-8 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-black/5 rounded-full blur-xl"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="p-4 bg-white/20 backdrop-blur-md rounded-full shadow-inner mb-4 ring-1 ring-white/30">
                        {statusConfig.icon}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight">{statusConfig.title}</h2>
                      <p className="text-blue-50 font-medium text-lg opacity-90">{statusConfig.subtitle}</p>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    {/* User Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-sm">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <FiUser className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Solicitante</span>
                        </div>
                        <p className="text-slate-900 font-semibold text-lg pl-11">{result.nome}</p>
                      </div>

                      <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-sm">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <FiFileText className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Protocolo</span>
                        </div>
                        <p className="text-slate-900 font-mono font-semibold text-lg pl-11">{result.protocolo || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Message Box */}
                    <div className={`p-5 rounded-2xl ${statusConfig.iconBg} border ${statusConfig.borderColor} mb-8`}>
                      <div className="flex gap-4">
                        <FiInfo className={`w-6 h-6 ${statusConfig.iconColor} flex-shrink-0 mt-0.5`} />
                        <p className={`${statusConfig.textColor} font-medium leading-relaxed`}>
                          {statusConfig.message}
                        </p>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FiShield className="w-4 h-4 text-slate-400" />
                        Próximos Passos
                      </h3>
                      <div className="space-y-3">
                        {statusConfig.instructions.map((instruction, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 bg-white/80 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full ${statusConfig.iconBg} ${statusConfig.iconColor} flex items-center justify-center text-xs font-bold ring-1 ring-white`}>
                              {index + 1}
                            </span>
                            <p className="text-slate-600 text-sm font-medium leading-relaxed">{instruction}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-10 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          <Link
            href="/"
            className="inline-flex items-center text-slate-500 hover:text-blue-600 font-medium transition-colors duration-200 group"
          >
            <FiArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Voltar para a página inicial
          </Link>

          <div className="pt-6 border-t border-slate-200/60">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Sala Sensorial - ALECE. Todos os direitos reservados.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
