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
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      } else {
        setUserId(session.user.id);
      }
    };
    checkUser();
  }, [router]);

  const isValidCpf = (cpf: string) => {
    return /^[0-9]{11}$/.test(cpf);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMessage('Usuário não autenticado.');
      return;
    }
    if (!isValidCpf(cpf)) {
      setMessage('CPF inválido. Use apenas números, sem pontos ou traços.');
      return;
    }
    setLoading(true);

    const now = new Date();
    const diaAtual = now.toISOString().split('T')[0];
    const horario = now.toTimeString().split(' ')[0];

    const { data: protocolData, error: protocolError } = await supabase.rpc('generate_protocolo');
    if (protocolError) {
      setMessage('Erro ao gerar número de protocolo: ' + protocolError.message);
      setLoading(false);
      return;
    }

    const protocolo = protocolData;
    const { error } = await supabase.from('atendimentos').insert([
      { nome, cpf, email, solicitante, horario, dia_atual: diaAtual, usuario_id: userId, protocolo }
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
        body: JSON.stringify({ to: email, nome, cpf, protocolo })
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Atendimento cadastrado com sucesso! E-mail enviado.');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setMessage('Atendimento cadastrado, mas erro ao enviar e-mail: ' + result.error);
      }
    } catch (emailError) {
      setMessage('Atendimento cadastrado, mas houve erro ao enviar o e-mail.');
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Gestão de Atendimentos Sala Sensorial / Alece</h1>
        <button onClick={() => router.push('/dashboard')} className="back-button">
          Voltar
        </button>
      </header>

      <main className="main">
        <h2>Cadastrar Atendimento</h2>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="nome">Nome</label>
            <input
              type="text"
              id="nome"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="cpf">CPF</label>
            <input
              type="text"
              id="cpf"
              placeholder="CPF (apenas números)"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="solicitante">Solicitante</label>
            <input
              type="text"
              id="solicitante"
              placeholder="Solicitante"
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              required
            />
          </div>
          <div className="button-group">
            <button type="submit" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
            <button
              type="button"
              className="cancel"
              onClick={() => router.push('/dashboard')}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
        {message && (
          <p className={`message ${message.includes('sucesso') ? 'success' : 'error'}`}>
            {message}
          </p>
        )}
      </main>

      <footer className="footer">
        <p>© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
      </footer>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f3f4f6; /* Fundo claro como no dashboard */
        }

        .header {
          background-color: #008751;
          color: white;
          padding: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
        }

        .header h1 {
          font-size: 24px;
          font-weight: 700;
        }

        .back-button {
          background: #1e40af;
          color: white;
          border: none;
          padding: 8px 20px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.3s ease-in-out;
        }

        .back-button:hover {
          background: #1e3a8a;
        }

        .main {
          max-width: 600px; /* Ajustado para ser um pouco menor que o dashboard */
          margin: 40px auto;
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        }

        .main h2 {
          color: #008751;
          font-size: 24px;
          text-align: center;
          margin-bottom: 20px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        label {
          font-size: 16px;
          color: #333;
          margin-bottom: 5px;
        }

        input {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #d1d5db;
          border-radius: 5px;
          outline: none;
          transition: border-color 0.3s;
        }

        input:focus {
          border-color: #008751;
        }

        .button-group {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
        }

        button {
          background: #008751;
          color: white;
          border: none;
          padding: 12px 20px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s ease-in-out;
        }

        button:hover {
          background: #00663d;
        }

        button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }

        .cancel {
          background: #d9534f;
        }

        .cancel:hover {
          background: #c9302c;
        }

        .message {
          margin-top: 20px;
          text-align: center;
          font-size: 16px;
        }

        .success {
          color: #008751;
        }

        .error {
          color: #d9534f;
        }

        .footer {
          background-color: #008751;
          color: white;
          padding: 20px;
          text-align: center;
          box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
          margin-top: auto;
        }

        .footer p {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}