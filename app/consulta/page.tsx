'use client';

import React from 'react';
import { useState } from 'react';
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
  FiCalendar
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
          icon: <FiCheckCircle className="w-12 h-12" />,
          title: '✅ Documento Pronto!',
          subtitle: 'Disponível para Retirada',
          message: 'Sua Carteira de Identidade Nacional está pronta e pode ser retirada.',
          instructions: [
            'Documento disponível na Sala Sensorial - ALECE',
            'Pode ser retirado por: pais, avós, tios de 1º grau ou irmãos maiores de 18 anos',
            'Necessário apresentar documento que comprove o vínculo familiar',
            'Trazer documento de identificação com foto'
          ],
          gradient: 'from-emerald-500 via-green-500 to-teal-500',
          bgGradient: 'from-emerald-50 to-green-50',
          borderColor: 'border-emerald-300',
          textColor: 'text-emerald-900',
          iconColor: 'text-emerald-600',
          iconBg: 'bg-emerald-100'
        };
      case 'em_andamento':
        return {
          icon: <FiClock className="w-12 h-12" />,
          title: '⏳ Em Processamento',
          subtitle: 'Aguarde o Prazo de Entrega',
          message: 'Seu documento está sendo processado pela Polícia Federal.',
          instructions: [
            'Prazo normal de entrega: até 20 dias úteis',
            'Acompanhe o status regularmente por esta página',
            'Você receberá um email quando o documento estiver pronto',
            'Após 20 dias sem retorno, entre em contato: (85) 2180-6587'
          ],
          gradient: 'from-blue-500 via-sky-500 to-cyan-500',
          bgGradient: 'from-blue-50 to-sky-50',
          borderColor: 'border-blue-300',
          textColor: 'text-blue-900',
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100'
        };
      case 'correcao':
      case 'correção':
        return {
          icon: <FiAlertCircle className="w-12 h-12" />,
          title: '⚠️ Em Correção',
          subtitle: 'Atenção Necessária',
          message: 'Seu documento precisa de correções antes de ser finalizado.',
          instructions: [
            'Entre em contato com a Sala Sensorial o quanto antes',
            'Telefone para contato: (85) 2180-6587',
            'Verifique se todos os documentos estão corretos',
            'Pode ser necessário comparecer presencialmente'
          ],
          gradient: 'from-amber-500 via-yellow-500 to-orange-500',
          bgGradient: 'from-amber-50 to-yellow-50',
          borderColor: 'border-amber-300',
          textColor: 'text-amber-900',
          iconColor: 'text-amber-600',
          iconBg: 'bg-amber-100'
        };
      case 'bloqueado':
        return {
          icon: <FiLock className="w-12 h-12" />,
          title: '🔒 Documento Bloqueado',
          subtitle: 'Entre em Contato',
          message: 'Este documento foi bloqueado. É necessário entrar em contato com o setor.',
          instructions: [
            'Entre em contato urgentemente: (85) 2180-6587',
            'Informe seu número de protocolo',
            'Verifique os motivos do bloqueio',
            'Siga as orientações da equipe de atendimento'
          ],
          gradient: 'from-slate-500 via-gray-500 to-zinc-500',
          bgGradient: 'from-slate-50 to-gray-50',
          borderColor: 'border-slate-300',
          textColor: 'text-slate-900',
          iconColor: 'text-slate-600',
          iconBg: 'bg-slate-100'
        };
      case 'cancelado':
        return {
          icon: <FiXCircle className="w-12 h-12" />,
          title: '❌ Solicitação Cancelada',
          subtitle: 'Ação Necessária',
          message: 'Sua solicitação foi cancelada. Entre em contato para entender o motivo.',
          instructions: [
            'Ligue imediatamente: (85) 2180-6587',
            'Tenha em mãos seu CPF e protocolo',
            'Entenda o motivo do cancelamento',
            'Verifique a possibilidade de nova solicitação'
          ],
          gradient: 'from-rose-500 via-red-500 to-pink-500',
          bgGradient: 'from-rose-50 to-red-50',
          borderColor: 'border-rose-300',
          textColor: 'text-rose-900',
          iconColor: 'text-rose-600',
          iconBg: 'bg-rose-100'
        };
      default:
        return {
          icon: <FiInfo className="w-12 h-12" />,
          title: 'ℹ️ Status Desconhecido',
          subtitle: 'Entre em Contato',
          message: 'Status do documento não identificado. Entre em contato com o setor.',
          instructions: [
            'Ligue: (85) 2180-6587',
            'Informe seu CPF e protocolo',
            'Solicite informações sobre o status atual'
          ],
          gradient: 'from-slate-500 to-gray-500',
          bgGradient: 'from-slate-50 to-gray-50',
          borderColor: 'border-slate-300',
          textColor: 'text-slate-900',
          iconColor: 'text-slate-600',
          iconBg: 'bg-slate-100'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-40 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 right-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full blur-2xl opacity-40 animate-pulse"></div>
              <Image
                src="/logoautismo.png"
                alt="Logo ALECE"
                width={120}
                height={120}
                className="object-contain relative z-10"
                priority
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl mb-4 shadow-xl">
              <FiFileText className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-5xl sm:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Consulta de CIN
              </span>
            </h1>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Digite seu CPF para consultar o status da sua Carteira de Identidade Nacional
            </p>
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-blue-200 overflow-hidden backdrop-blur-sm bg-white/95">
          {/* Barra colorida */}
          <div className="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          <div className="p-8 sm:p-12">
            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6 mb-8">
              <div>
                <label htmlFor="cpf" className="block text-sm font-bold text-slate-700 mb-3">
                  <div className="flex items-center">
                    <FiHash className="w-5 h-5 mr-2 text-blue-500" />
                    CPF do Solicitante
                  </div>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <FiUser className="h-6 w-6 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  </div>
                  <input
                    type="text"
                    id="cpf"
                    value={cpf}
                    onChange={handleCPFChange}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    className="block w-full pl-14 pr-5 py-5 text-xl border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-slate-50 focus:bg-white font-medium"
                    disabled={loading}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500 flex items-center">
                  <FiInfo className="w-4 h-4 mr-1" />
                  Digite apenas os números do CPF
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`group w-full flex items-center justify-center py-5 px-8 text-xl font-bold rounded-2xl text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-4 focus:ring-purple-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden ${
                  loading ? '' : ''
                }`}
              >
                {!loading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                )}
                {loading ? (
                  <>
                    <FiLoader className="animate-spin -ml-1 mr-3 h-7 w-7" />
                    Consultando documento...
                  </>
                ) : (
                  <>
                    <FiSearch className="-ml-1 mr-3 h-7 w-7 group-hover:scale-110 transition-transform duration-200" />
                    Consultar Status
                  </>
                )}
              </button>
            </form>

            {/* Erro */}
            {error && (
              <div className="mb-8 p-6 bg-gradient-to-r from-rose-50 to-red-50 border-2 border-rose-300 rounded-2xl flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-3 bg-rose-100 rounded-xl">
                  <FiAlertCircle className="h-7 w-7 text-rose-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-bold text-rose-800 mb-1">Erro na Consulta</h3>
                  <p className="text-base text-rose-700">{error}</p>
                </div>
              </div>
            )}

            {/* Resultado */}
            {result && statusConfig && (
              <div className={`rounded-3xl border-4 ${statusConfig.borderColor} bg-gradient-to-br ${statusConfig.bgGradient} overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                {/* Header do Status */}
                <div className={`bg-gradient-to-r ${statusConfig.gradient} p-6 text-white`}>
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                      {statusConfig.icon}
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-center mb-2">
                    {statusConfig.title}
                  </h2>
                  <p className="text-center text-lg font-medium opacity-90">
                    {statusConfig.subtitle}
                  </p>
                </div>

                {/* Conteúdo */}
                <div className="p-8">
                  {/* Informações do Solicitante */}
                  <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
                    <h3 className="text-sm font-bold text-slate-600 uppercase mb-4 flex items-center">
                      <FiUser className="w-4 h-4 mr-2" />
                      Informações do Solicitante
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center p-4 bg-slate-50 rounded-xl">
                        <FiUser className="w-5 h-5 text-slate-500 mr-3" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Nome</p>
                          <p className="text-base font-bold text-slate-900">{result.nome}</p>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-slate-50 rounded-xl">
                        <FiFileText className="w-5 h-5 text-slate-500 mr-3" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Protocolo</p>
                          <p className="text-base font-bold text-slate-900 font-mono">{result.protocolo || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mensagem Principal */}
                  <div className={`p-6 rounded-2xl ${statusConfig.iconBg} mb-6`}>
                    <p className={`text-lg font-semibold ${statusConfig.textColor}`}>
                      {statusConfig.message}
                    </p>
                  </div>

                  {/* Instruções */}
                  <div className="space-y-3">
                    <h4 className={`text-sm font-bold ${statusConfig.textColor} uppercase mb-3`}>
                      📋 Próximos Passos:
                    </h4>
                    {statusConfig.instructions.map((instruction, index) => (
                      <div key={index} className="flex items-start p-4 bg-white rounded-xl shadow-sm">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full ${statusConfig.iconBg} ${statusConfig.iconColor} flex items-center justify-center text-xs font-bold mr-3 mt-0.5`}>
                          {index + 1}
                        </div>
                        <p className="text-base text-slate-700">{instruction}</p>
                      </div>
                    ))}
                  </div>

                  {/* Informações de Contato */}
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center p-4 bg-white rounded-xl shadow-sm">
                        <FiPhone className="w-6 h-6 text-blue-600 mr-3" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Telefone</p>
                          <p className="text-lg font-bold text-slate-900">(85) 2180-6587</p>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-white rounded-xl shadow-sm">
                        <FiMapPin className="w-6 h-6 text-blue-600 mr-3" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Localização</p>
                          <p className="text-sm font-bold text-slate-900">Sala Sensorial - ALECE</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-t-2 border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/"
                className="group flex items-center text-lg text-blue-600 hover:text-blue-700 transition-all duration-200 font-bold"
              >
                <FiArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform duration-200" />
                Voltar para a página inicial
              </Link>

              <div className="text-sm text-slate-500 text-center sm:text-right">
                <p className="font-semibold text-slate-700">
                  Central de Atendimento
                </p>
                <p>
                  Dúvidas? Ligue:
                  <span className="font-bold text-blue-600 ml-1">(85) 2180-6587</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Sala Sensorial - ALECE. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
