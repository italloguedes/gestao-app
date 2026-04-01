'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
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
  const [lastUpdated, setLastUpdated] = useState<{ nome: string; cpf: string; solicitante: string; hora: string } | null>(null);
  const cpfInputRef = useRef<HTMLInputElement>(null);
  const shouldFocusRef = useRef(false);

  // Focar o input quando loading mudar para false (DOM já atualizado)
  useEffect(() => {
    if (!loading && shouldFocusRef.current) {
      shouldFocusRef.current = false;
      cpfInputRef.current?.focus();
    }
  }, [loading]);

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
        shouldFocusRef.current = true;
        setLoading(false);
        return;
      }

      // Formatar o CPF removendo caracteres não numéricos
      const cpfLimpo = cpf.replace(/\D/g, '');

      if (cpfLimpo.length !== 11) {
        setMessage({ text: 'CPF inválido. Insira um CPF válido com 11 dígitos.', type: 'error' });
        shouldFocusRef.current = true;
        setLoading(false);
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
        shouldFocusRef.current = true;
        setLoading(false);
        return;
      }

      if (!atendimentos || atendimentos.length === 0) {
        setMessage({ text: 'Atendimento não encontrado para este CPF', type: 'error' });
        shouldFocusRef.current = true;
        setLoading(false);
        return;
      }

      const atendimento = atendimentos[0];

      if (atendimento.status === 'Concluído' || atendimento.status === 'concluido') {
        setMessage({ text: 'Este atendimento já está concluído', type: 'error' });
        shouldFocusRef.current = true;
        setLoading(false);
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
        shouldFocusRef.current = true;
        setLoading(false);
        return;
      }

      console.log('Status atualizado, enviando email...');

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();

      // Enviar email de conclusão
      fetch('/api/cin-pronta', {
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
      }).then(async (response) => {
        const emailResult = await response.json();
        if (!response.ok) {
          console.error('Erro ao enviar email:', emailResult);
        } else {
          console.log('Email enviado com sucesso');
        }
      }).catch((error) => {
        console.error('Erro ao enviar email:', error);
      });

      // Mostrar sucesso imediatamente sem aguardar email
      setMessage({
        text: `CIN atualizada com sucesso! Email de notificação será enviado para ${atendimento.nome}.`,
        type: 'success'
      });

      // Guardar último atendimento processado
      const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastUpdated({
        nome: atendimento.nome,
        cpf: atendimento.cpf,
        solicitante: user?.user_metadata?.name || user?.email || 'Desconhecido',
        hora: agora,
      });

      // Limpar formulário e refocar imediatamente para próxima digitação
      setCpf('');
      shouldFocusRef.current = true;
      setLoading(false);

    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      setMessage({ text: 'Erro ao processar a solicitação: ' + (error as Error).message, type: 'error' });
      shouldFocusRef.current = true;
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCpf('');
    setMessage(null);
    if (cpfInputRef.current) {
      cpfInputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header com Logo */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
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
          className="group flex items-center text-emerald-700 hover:text-emerald-900 transition-all duration-200 mb-6 bg-white/50 px-4 py-2 rounded-xl backdrop-blur-sm border border-emerald-100/50 shadow-sm hover:shadow"
        >
          <FiArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="font-medium">Voltar</span>
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-emerald-200">
            <FiCreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent mb-3">
            Atualizar Status da CIN
          </h1>
          <p className="text-lg text-emerald-700/80 max-w-2xl mx-auto font-medium">
            Informe o CPF do cidadão para atualizar o status do documento e enviar notificação
          </p>
        </div>
      </div>

      {/* Card Principal */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-100 border-4 border-white overflow-hidden ring-1 ring-emerald-100">
          {/* Barra colorida do topo */}
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500"></div>

          <div className="p-8 sm:p-12">
            {/* Mensagem de Feedback */}
            {message && (
              <div className={`mb-6 rounded-2xl border-2 p-5 flex items-start animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success'
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-sm'
                  : 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-200 shadow-sm'
                }`}>
                <div className={`p-2 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                  {message.type === 'success' ? (
                    <FiCheckCircle className="w-6 h-6" />
                  ) : (
                    <FiAlertCircle className="w-6 h-6" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <p className={`font-bold text-base ${message.type === 'success' ? 'text-emerald-800' : 'text-rose-800'
                    }`}>
                    {message.type === 'success' ? 'Sucesso!' : 'Erro!'}
                  </p>
                  <p className={`text-sm mt-1 font-medium ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Campo CPF */}
              <div>
                <label htmlFor="cpf" className="block text-sm font-bold text-slate-700 mb-3 px-1">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-emerald-100 rounded-lg mr-2">
                      <FiHash className="w-4 h-4 text-emerald-600" />
                    </div>
                    CPF do Atendimento
                  </div>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                    <FiUser className="h-6 w-6 text-emerald-300 group-focus-within:text-emerald-500 transition-colors duration-200" />
                  </div>
                  <input
                    ref={cpfInputRef}
                    type="text"
                    id="cpf"
                    value={cpf}
                    onChange={handleCPFChange}
                    className="block w-full pl-14 pr-4 py-5 text-xl font-medium tracking-wide border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 bg-slate-50 focus:bg-white placeholder:text-slate-300"
                    placeholder="000.000.000-00"
                    required
                    autoFocus
                    maxLength={14}
                    disabled={loading}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 rounded-b-2xl opacity-50"></div>
                </div>
                <p className="mt-3 text-xs text-slate-500 flex items-center px-1 font-medium">
                  <FiAlertCircle className="w-3 h-3 mr-1.5 text-emerald-500" />
                  Digite o CPF do titular do atendimento (com ou sem pontuação)
                </p>
              </div>

              {/* Informações */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FiCreditCard className="w-24 h-24 text-emerald-600 transform rotate-12" />
                </div>
                <div className="flex items-start relative z-10">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-emerald-100 mr-4">
                    <FiMail className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-emerald-900 mb-2">
                      O que acontece ao atualizar?
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm text-emerald-800/80 font-medium bg-white/50 p-2 rounded-lg">
                        <FiCheckCircle className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
                        Status atualizado para "Concluído"
                      </li>
                      <li className="flex items-center text-sm text-emerald-800/80 font-medium bg-white/50 p-2 rounded-lg">
                        <FiCheckCircle className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
                        Email de notificação enviado ao cidadão
                      </li>
                      <li className="flex items-center text-sm text-emerald-800/80 font-medium bg-white/50 p-2 rounded-lg">
                        <FiCheckCircle className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
                        Documento liberado para retirada
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center px-6 py-4 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border-2 border-transparent hover:border-emerald-200 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed group"
                  disabled={loading}
                >
                  <FiRefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Limpar
                </button>
                <button
                  type="submit"
                  className="flex-[2] group flex items-center justify-center px-8 py-4 text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-500 rounded-xl shadow-lg hover:shadow-xl hover:shadow-emerald-200 transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden transform hover:-translate-y-1"
                  disabled={loading}
                >
                  {!loading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                  {loading ? (
                    <>
                      <FiLoader className="w-5 h-5 mr-2 animate-spin" />
                      Processando Solicitação...
                    </>
                  ) : (
                    <>
                      <FiSend className="w-5 h-5 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                      Atualizar Status e Notificar
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Último atendimento processado */}
            {lastUpdated && (
              <div className="mt-8 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-emerald-100 rounded-xl mr-3">
                    <FiCheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Último Atendimento Atualizado</p>
                    <p className="text-xs text-slate-400 font-medium">{lastUpdated.hora}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white/70 rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                      <FiUser className="w-3 h-3 mr-1" /> Nome
                    </p>
                    <p className="text-base font-bold text-emerald-900 truncate">{lastUpdated.nome}</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                      <FiHash className="w-3 h-3 mr-1" /> CPF
                    </p>
                    <p className="text-base font-bold text-emerald-900 tracking-wider">
                      {lastUpdated.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                      <FiCreditCard className="w-3 h-3 mr-1" /> Solicitante
                    </p>
                    <p className="text-base font-bold text-emerald-900 truncate">{lastUpdated.solicitante}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé informativo */}
            <div className="mt-10 pt-6 border-t border-slate-100">
              <div className="text-center text-xs text-slate-500">
                <p className="font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Central de Atendimento
                </p>
                <p className="flex items-center justify-center gap-2 text-slate-600 font-medium">
                  Em caso de dúvidas, entre em contato:
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold border border-emerald-100">
                    (85) 2180-6587
                  </span>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
        <div className="text-center">
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-20 animate-pulse rounded-full"></div>
            <FiLoader className="w-12 h-12 text-emerald-600 animate-spin mx-auto relative z-10" />
          </div>
          <p className="text-emerald-800 font-semibold text-lg animate-pulse">Carregando interface...</p>
        </div>
      </div>
    }>
      <AtualizarCINForm />
    </Suspense>
  );
}
