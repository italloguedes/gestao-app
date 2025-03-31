'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

// Interface para os dados de atendimento
interface Atendimento {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  dia_atual: string;
  usuario_id: string;
}

export default function CadastrarCIN() {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Obtém o ID do usuário logado
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redireciona para login se não estiver logado
      } else {
        setUserId(session.user.id);
      }
    };
    fetchUser();
  }, [router]);

  const handleCadastrarCIN = async () => {
    setMensagem(null);
    setLoading(true);

    if (!userId) {
      setMensagem('Usuário não autenticado. Faça login novamente.');
      setLoading(false);
      return;
    }

    if (!cpf) {
      setMensagem('Por favor, insira o CPF.');
      setLoading(false);
      return;
    }

    try {
      // Busca nome e e-mail na tabela atendimentos
      const { data: atendimento, error: erroAtendimento } = await supabase
        .from('atendimentos')
        .select('nome, email')
        .eq('cpf', cpf)
        .single();

      if (erroAtendimento || !atendimento) {
        setMensagem('CPF não encontrado na tabela de atendimentos.');
        setLoading(false);
        return;
      }

      const nome = atendimento.nome;
      const email = atendimento.email;
      if (!email) {
        setMensagem('Nenhum e-mail associado a este CPF.');
        setLoading(false);
        return;
      }

      // Cadastra a CIN na tabela cins
      const { error: erroCadastro } = await supabase
        .from('cins')
        .insert({
          nome,
          cpf,
          status: 'pronta',
        });

      if (erroCadastro) {
        setMensagem('Erro ao cadastrar a CIN: ' + erroCadastro.message);
        setLoading(false);
        return;
      }

      // Envia o e-mail
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, nome, cpf }),
      });

      const result = await response.json();
      if (!response.ok) {
        setMensagem('CIN cadastrada, mas erro ao enviar o e-mail: ' + result.error);
        setLoading(false);
        return;
      }

      setMensagem('CIN cadastrada com sucesso! E-mail enviado para ' + email + '.');
    } catch (err) {
      setMensagem('Erro ao processar a solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
        <h2>Cadastrar CIN</h2>
        <div className="form">
          <div className="form-group">
            <label htmlFor="cpf">CPF</label>
            <input
              type="text"
              id="cpf"
              placeholder="Digite o CPF (apenas números)"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
          </div>
          <div className="button-group">
            <button onClick={handleCadastrarCIN} disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar CIN'}
            </button>
            <button
              className="cancel"
              onClick={() => router.push('/dashboard')}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
        {mensagem && (
          <p className={`message ${mensagem.includes('sucesso') ? 'success' : 'error'}`}>
            {mensagem}
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