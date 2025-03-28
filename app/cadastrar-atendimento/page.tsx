// app/cadastrar-atendimento/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CadastrarAtendimento() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  // Verifica se o usuário está logado e obtém o usuario_id
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redireciona para a página de login se não estiver logado
      } else {
        setUserId(session.user.id);
      }
    };
    fetchUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setMessage('Usuário não autenticado.');
      return;
    }

    // Obtém a data e horário atuais
    const now = new Date();
    const diaAtual = now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const horario = now.toTimeString().split(' ')[0]; // Formato HH:MM:SS
    const createdAt = now.toISOString();
    const updatedAt = now.toISOString();

    // Gera o número de protocolo chamando a função do Supabase
    const { data: protocolData, error: protocolError } = await supabase
      .rpc('generate_protocolo');

    if (protocolError) {
      setMessage('Erro ao gerar número de protocolo: ' + protocolError.message);
      return;
    }

    const protocolo = protocolData; // Exemplo: "2025-0001"

    // Insere o atendimento no Supabase
    const { data, error } = await supabase.from('atendimentos').insert([
      {
        nome,
        cpf,
        email,
        solicitante,
        horario,
        dia_atual: diaAtual,
        usuario_id: userId,
        created_at: createdAt,
        updated_at: updatedAt,
        protocolo, // Adiciona o número de protocolo
      },
    ]);

    if (error) {
      setMessage('Erro ao cadastrar atendimento: ' + error.message);
      return;
    }

    // Monta o corpo do e-mail com o número de protocolo
    const emailBody = `
Olá ${nome}, CPF - ${cpf}.
Seu atendimento foi realizado com sucesso e o prazo para retirada é de 20 dias.

**Número de Protocolo: ${protocolo}**

© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.
    `.trim();

    // Envia o e-mail chamando a API Route
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Confirmação de Atendimento - ${nome}`,
          text: emailBody,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Atendimento cadastrado com sucesso! E-mail de confirmação enviado.');
        setTimeout(() => router.push('/dashboard'), 2000); // Redireciona após 2 segundos
      } else {
        setMessage('Atendimento cadastrado, mas houve um erro ao enviar o e-mail: ' + result.error);
      }
    } catch (emailError) {
      setMessage('Atendimento cadastrado, mas houve um erro ao enviar o e-mail.');
      console.error(emailError);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Cadastrar Atendimento</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Nome:</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>CPF:</label>
          <input
            type="text"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Solicitante:</label>
          <input
            type="text"
            value={solicitante}
            onChange={(e) => setSolicitante(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px' }}>
          Cadastrar
        </button>
      </form>
      <button
        onClick={() => router.push('/dashboard')}
        style={{ marginTop: '10px', padding: '10px 20px' }}
      >
        Voltar
      </button>
      {message && <p style={{ marginTop: '15px', color: message.includes('sucesso') ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}