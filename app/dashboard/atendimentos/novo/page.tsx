"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { registrarHistorico } from '@/lib/historico-utils';
import { FiUser, FiCreditCard, FiMail, FiFileText, FiSave, FiArrowLeft, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export default function NovoAtendimentoPage() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [protocolo, setProtocolo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  const isValidCpf = (cpf: string) => /^[0-9]{11}$/.test(cpf);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage('Usuário não autenticado.');
      return;
    }
    if (!isValidCpf(cpf)) {
      setMessage('CPF inválido. Use apenas números, sem pontos ou traços.');
      return;
    }
    if (!protocolo) {
      setMessage('Informe o número de protocolo.');
      return;
    }

    setLoading(true);
    setMessage('');

    // Verificar se o CPF já existe no banco de dados
    const { data: existingCpf, error: cpfCheckError } = await supabase
      .from('atendimentos')
      .select('cpf')
      .eq('cpf', cpf)
      .single();

    if (cpfCheckError && cpfCheckError.code !== 'PGRST116') {
      setMessage('Erro ao verificar CPF: ' + cpfCheckError.message);
      setLoading(false);
      return;
    }

    if (existingCpf) {
      setMessage('CPF já cadastrado no sistema. Verifique se o atendimento já foi realizado.');
      setLoading(false);
      return;
    }

    const now = new Date();
    const diaAtual = now.toISOString().split('T')[0];
    const horario = now.toTimeString().split(' ')[0];

    // Buscar nome do atendente para salvar no registro
    const atendenteNome = user.user_metadata?.name || user.user_metadata?.full_name || 'Não identificado';

    const { error } = await supabase.from('atendimentos').insert([
      {
        nome,
        cpf,
        email,
        solicitante,
        horario,
        dia_atual: diaAtual,
        usuario_id: user.id,
        atendente_nome: atendenteNome,
        protocolo,
        status: 'em_andamento',
      },
    ]);

    if (error) {
      setMessage('Erro ao cadastrar atendimento: ' + error.message);
      setLoading(false);
      return;
    }

    // Registrar histórico de criação
    const { data: novoAte } = await supabase.from('atendimentos').select('id').eq('cpf', cpf).order('created_at', { ascending: false }).limit(1).single();
    if (novoAte?.id) {
      await registrarHistorico({
        atendimento_id: novoAte.id,
        acao: 'criacao',
        atendente_id: user.id,
        atendente_nome: atendenteNome,
      });
    }

    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          to: email,
          subject: `Atendimento Realizado, ${nome}! 🎉`,
          html: `
<div style="background: #fafbfc; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
<div style="text-align: center; margin-bottom: 24px;">
<img src="https://salasensorial.vercel.app/logoautismo.png" alt="Logo Autismo" style="max-width: 120px; margin-bottom: 8px;" />
</div>
<div style="background: #fff; border-radius: 10px; padding: 32px 24px; box-shadow: 0 2px 8px #0001;">
<h2 style="text-align: center; font-size: 1.5rem; font-weight: bold; margin-bottom: 18px;">
Atendimento para emissão da CIN (Carteira de Identidade Nacional)
</h2>
<p style="margin-bottom: 18px;">
Olá, ${nome}! Seu atendimento foi realizado com sucesso. O prazo para retirada é de 20 dias.
</p>
<p style="margin-bottom: 10px;">
<b>Nome:</b> ${nome}<br>
<b>CPF:</b> ${cpf}<br>
<b>Número de Protocolo:</b> ${protocolo}
</p>
<p style="margin-bottom: 0;">
Para dúvidas, entre em contato pelo telefone (85) 2180-6587.
</p>
</div>
<div style="text-align: center; margin-top: 24px; color: #888; font-size: 13px;">
© 2025 <span style="color: #bfa13a; font-weight: bold;">Sala</span> Sensorial - ALECE. Todos os direitos reservados.
</div>
</div>
`,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Atendimento cadastrado com sucesso! E-mail enviado.');
        setTimeout(() => router.push('/dashboard/atendimentos'), 2000);
      } else {
        setMessage('Atendimento cadastrado, mas erro ao enviar e-mail: ' + result.error);
      }
    } catch (err) {
      setMessage('Atendimento cadastrado, mas houve erro ao enviar o e-mail.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-8">

        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6">
            <FiFileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cadastrar Atendimento</h1>
          <p className="text-slate-500 text-lg">Preencha os dados abaixo para registrar um novo atendimento.</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">

          {/* Decorative Top Line */}
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 w-full"></div>

          <div className="p-8">
            {message && (
              <div className={`mb-6 flex items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all duration-300 animate-fade-in ${message.includes('sucesso')
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                {message.includes('sucesso') ? (
                  <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span>{message}</span>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-5">

                <div className="relative group">
                  <label htmlFor="nome" className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Nome do Cliente</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiUser className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                      placeholder="Nome completo do cliente"
                      required
                      minLength={3}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative group">
                    <label htmlFor="cpf" className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">CPF</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiCreditCard className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        id="cpf"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                        placeholder="Apenas números"
                        required
                        maxLength={11}
                      />
                    </div>
                  </div>

                  <div className="relative group">
                    <label htmlFor="protocolo" className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Protocolo</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiFileText className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        id="protocolo"
                        value={protocolo}
                        onChange={e => setProtocolo(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                        placeholder="Número de protocolo"
                        required
                        minLength={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">E-mail</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiMail className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                </div>

                <div className="relative group">
                  <label htmlFor="solicitante" className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Solicitante</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiUser className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      id="solicitante"
                      value={solicitante}
                      onChange={(e) => setSolicitante(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                      placeholder="Nome do solicitante"
                      required
                      minLength={3}
                    />
                  </div>
                </div>

              </div>

              <div className="pt-4 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center gap-2"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3.5 text-sm font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait transform active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <FiSave className="w-5 h-5" />
                      <span>Salvar Atendimento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm">
          Os dados serão salvos de forma segura e um e-mail de confirmação será enviado.
        </p>
      </div>
    </div>
  );
}
