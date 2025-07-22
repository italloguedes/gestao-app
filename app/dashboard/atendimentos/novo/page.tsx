"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/app/components/Loading';

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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-emerald-700 tracking-tight">Cadastrar Novo Atendimento</h1>
          <p className="text-gray-500 mt-2 text-base">Preencha os dados do atendimento</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-100">
          {message && (
            <div className={`mb-6 flex items-center gap-3 p-4 rounded-lg border text-sm font-medium transition-all duration-300 ${message.includes('sucesso')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {message.includes('sucesso') ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
              <span>{message}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={async (e) => {
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

            const { error } = await supabase.from('atendimentos').insert([
              {
                nome,
                cpf,
                email,
                solicitante,
                horario,
                dia_atual: diaAtual,
                usuario_id: user.id,
                protocolo,
                status: 'em_andamento',
              },
            ]);

            if (error) {
              setMessage('Erro ao cadastrar atendimento: ' + error.message);
              setLoading(false);
              return;
            }

            try {
              const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                setTimeout(() => router.push('/dashboard'), 2000);
              } else {
                setMessage('Atendimento cadastrado, mas erro ao enviar e-mail: ' + result.error);
              }
            } catch (err) {
              setMessage('Atendimento cadastrado, mas houve erro ao enviar o e-mail.');
            }

            setLoading(false);
          }}>
            <div>
              <label htmlFor="nome" className="block text-sm font-semibold text-gray-700 mb-1">Nome do Cliente</label>
              <input
                type="text"
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
                placeholder="Nome completo do cliente"
                required
                minLength={3}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-semibold text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
                placeholder="Apenas números"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div>
              <label htmlFor="solicitante" className="block text-sm font-semibold text-gray-700 mb-1">Solicitante</label>
              <input
                type="text"
                id="solicitante"
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
                placeholder="Nome do solicitante"
                required
                minLength={3}
              />
            </div>

            <div>
              <label htmlFor="protocolo" className="block text-sm font-semibold text-gray-700 mb-1">Protocolo</label>
              <input
                type="text"
                id="protocolo"
                value={protocolo}
                onChange={e => setProtocolo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
                placeholder="Digite o número de protocolo"
                required
                minLength={3}
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                )}
                {loading ? 'Cadastrando...' : 'Cadastrar Atendimento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
