'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  FiCheckCircle,
  FiAlertCircle,
  FiCreditCard,
  FiMail,
  FiArrowLeft,
  FiLoader,
  FiRefreshCw,
  FiHash,
  FiSend,
  FiUser
} from 'react-icons/fi';
import Image from 'next/image';

function AtualizarCINForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [cpf, setCpf] = useState(searchParams?.get('cpf') || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Formatar CPF durante digitação
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

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedCPF = formatCPF(value);
    setCpf(formattedCPF);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!user) {
        setMessage({ text: 'Usuário não autenticado', type: 'error' });
        return;
      }

      // Formatar o CPF removendo caracteres não numéricos
      const cpfLimpo = cpf.replace(/\D/g, '');

      if (cpfLimpo.length !== 11) {
        setMessage({ text: 'CPF inválido. Insira um CPF válido com 11 dígitos.', type: 'error' });
        return;
      }

      console.log('Buscando atendimento para CPF:', cpfLimpo);

      // Buscar atendimento pelo CPF
      const { data: atendimentos, error: fetchError } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('cpf', cpfLimpo)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('Resultado da busca:', { atendimentos, fetchError });

      if (fetchError) {
        console.error('Erro ao buscar atendimento:', fetchError);
        setMessage({ text: 'Erro ao buscar atendimento: ' + fetchError.message, type: 'error' });
        return;
      }

      if (!atendimentos || atendimentos.length === 0) {
        setMessage({ text: 'Atendimento não encontrado para este CPF', type: 'error' });
        return;
      }

      const atendimento = atendimentos[0];

      if (atendimento.status === 'Concluído' || atendimento.status === 'concluido') {
        setMessage({ text: 'Este atendimento já está concluído', type: 'error' });
        return;
      }

      console.log('Atualizando status do atendimento:', atendimento.id);

      // Atualizar status do atendimento
      const { error: updateError } = await supabase
        .from('atendimentos')
        .update({ status: 'Concluído' })
        .eq('id', atendimento.id);

      if (updateError) {
        console.error('Erro ao atualizar status:', updateError);
        setMessage({ text: 'Erro ao atualizar status do atendimento: ' + updateError.message, type: 'error' });
        return;
      }

      console.log('Status atualizado, enviando email...');

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();

      // Enviar email de conclusão
      const response = await fetch('/api/cin-pronta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          to: atendimento.email,
          nome: atendimento.nome,
          cpf: atendimento.cpf,
        }),
      });

      const emailResult = await response.json();

      if (!response.ok) {
        console.error('Erro ao enviar email:', emailResult);
        setMessage({
          text: 'Atendimento concluído, mas houve um erro ao enviar o email: ' + emailResult.error,
          type: 'error'
        });
        return;
      }

      console.log('Email enviado com sucesso');
      setMessage({
        text: `CIN atualizada com sucesso! Email de notificação enviado para ${atendimento.nome}.`,
        type: 'success'
      });

      // Limpar formulário após 2 segundos
      setTimeout(() => {
        setCpf('');
        setMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      setMessage({ text: 'Erro ao processar a solicitação: ' + (error as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCpf('');
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header com Logo */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
            <Image
              src="/logoautismo.png"
              alt="Logo ALECE"
              width={90}
              height={90}
              className="object-contain relative z-10"
              priority
            />
          </div>
        </div>

        <button
          onClick={() => router.back()}
          className="group flex items-center text-slate-600 hover:text-blue-600 transition-all duration-200 mb-6"
        >
          <FiArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="font-medium">Voltar</span>
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl mb-4">
            <FiCreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Atualizar Status da CIN
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Informe o CPF do cidadão para atualizar o status do documento e enviar notificação
          </p>
        </div>
      </div>

      {/* Card Principal */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-blue-200 overflow-hidden">
          {/* Barra colorida do topo */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          <div className="p-8 sm:p-12">
            {/* Mensagem de Feedback */}
            {message && (
              <div className={`mb-6 rounded-2xl border-2 p-5 flex items-start animate-in fade-in slide-in-from-top-2 duration-300 ${
                message.type === 'success'
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300'
                  : 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-300'
              }`}>
                <div className={`p-2 rounded-xl ${
                  message.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'
                }`}>
                  {message.type === 'success' ? (
                    <FiCheckCircle className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <FiAlertCircle className="w-6 h-6 text-rose-600" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <p className={`font-semibold text-base ${
                    message.type === 'success' ? 'text-emerald-800' : 'text-rose-800'
                  }`}>
                    {message.type === 'success' ? 'Sucesso!' : 'Erro!'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo CPF */}
              <div>
                <label htmlFor="cpf" className="block text-sm font-bold text-slate-700 mb-2">
                  <div className="flex items-center">
                    <FiHash className="w-4 h-4 mr-2 text-blue-500" />
                    CPF do Atendimento
                  </div>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  </div>
                  <input
                    type="text"
                    id="cpf"
                    value={cpf}
                    onChange={handleCPFChange}
                    className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-slate-50 focus:bg-white"
                    placeholder="000.000.000-00"
                    required
                    autoFocus
                    maxLength={14}
                    disabled={loading}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 flex items-center">
                  <FiAlertCircle className="w-3 h-3 mr-1" />
                  Digite o CPF com ou sem pontuação
                </p>
              </div>

              {/* Informações */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiMail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-bold text-blue-900 mb-1">
                      O que acontece ao atualizar?
                    </h3>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li className="flex items-center">
                        <FiCheckCircle className="w-3 h-3 mr-2 text-blue-600" />
                        Status do atendimento será atualizado para "Concluído"
                      </li>
                      <li className="flex items-center">
                        <FiCheckCircle className="w-3 h-3 mr-2 text-blue-600" />
                        Email de notificação será enviado ao cidadão
                      </li>
                      <li className="flex items-center">
                        <FiCheckCircle className="w-3 h-3 mr-2 text-blue-600" />
                        Documento estará disponível para retirada
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center px-6 py-4 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border-2 border-slate-300 hover:border-slate-400 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <FiRefreshCw className="w-5 h-5 mr-2" />
                  Limpar
                </button>
                <button
                  type="submit"
                  className="flex-1 group flex items-center justify-center px-6 py-4 text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  disabled={loading}
                >
                  {!loading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                  {loading ? (
                    <>
                      <FiLoader className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <FiSend className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
                      Atualizar e Notificar
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Rodapé informativo */}
            <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200">
              <div className="text-center text-xs text-slate-500">
                <p className="font-semibold text-slate-700 mb-1">
                  Central de Atendimento
                </p>
                <p>
                  Em caso de dúvidas, entre em contato:
                  <span className="font-bold text-blue-600 ml-1">(85) 2180-6587</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AtualizarCINPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <FiLoader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Carregando...</p>
        </div>
      </div>
    }>
      <AtualizarCINForm />
    </Suspense>
  );
}
