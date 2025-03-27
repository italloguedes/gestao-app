'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { sendEmail } from '../../lib/sendEmail';

export default function CadastrarAtendimento() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [horario, setHorario] = useState('');
  const [diaAtual, setDiaAtual] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
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
      alert('Usuário não autenticado.');
      return;
    }

    // Insere o atendimento no Supabase
    const { data, error } = await supabase.from('atendimentos').insert([
      {
        nome,
        cpf,
        email,
        horario,
        dia_atual: diaAtual,
        usuario_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert('Erro ao cadastrar atendimento: ' + error.message);
    } else {
      try {
        // Envia o e-mail
        await sendEmail(email, nome, horario, diaAtual);
        alert('Atendimento cadastrado com sucesso! E-mail de confirmação enviado.');
      } catch (emailError) {
        alert('Atendimento cadastrado, mas houve um erro ao enviar o e-mail.');
      }
      router.push('/dashboard'); // Redireciona para o dashboard após o cadastro
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
          <label>Horário:</label>
          <input
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Dia:</label>
          <input
            type="date"
            value={diaAtual}
            onChange={(e) => setDiaAtual(e.target.value)}
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
    </div>
  );
}