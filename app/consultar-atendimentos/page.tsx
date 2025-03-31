'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

interface Atendimento {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  horario: string;
  dia_atual: string;
  created_at: string;
  updated_at: string;
  usuario_id: string;
}

export default function ConsultaAtendimento() {
  const router = useRouter();
  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState<Atendimento[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verifica autenticação e adiciona efeito de fundo
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redireciona se não estiver logado
      } else {
        setIsAuthenticated(true);
      }
    };
    checkUser();

    // Efeito de mudança de cor no fundo (consistente com outras páginas)
    const colors = ['#f3e8ff', '#e0f2fe', '#dcfce7', '#fef3c7'];
    let currentIndex = 0;
    const changeBackgroundColor = () => {
      document.body.style.backgroundColor = colors[currentIndex];
      currentIndex = (currentIndex + 1) % colors.length;
    };
    changeBackgroundColor();
    const interval = setInterval(changeBackgroundColor, 5000);
    document.body.style.transition = 'background-color 1s ease-in-out';
    return () => clearInterval(interval);
  }, [router]);

  const buscarAtendimentos = async () => {
    setMensagem(null);
    setResultados([]);
    setLoading(true);

    if (!termoBusca.trim()) {
      setMensagem('Por favor, digite um nome ou CPF para buscar.');
      setLoading(false);
      return;
    }

    try {
      console.log('Buscando com termo:', termoBusca);

      // Busca por nome
      const { data: dataNome, error: errorNome } = await supabase
        .from('atendimentos')
        .select('*')
        .ilike('nome', `%${termoBusca}%`);

      console.log('Resultados por nome:', dataNome, 'Erro:', errorNome);

      // Busca por CPF
      const { data: dataCpf, error: errorCpf } = await supabase
        .from('atendimentos')
        .select('*')
        .ilike('cpf', `%${termoBusca}%`);

      console.log('Resultados por CPF:', dataCpf, 'Erro:', errorCpf);

      if (errorNome || errorCpf) {
        setMensagem('Erro ao buscar atendimentos: ' + (errorNome?.message || errorCpf?.message));
        setLoading(false);
        return;
      }

      // Combina os resultados, removendo duplicatas
      const combinedResults = [
        ...(dataNome || []),
        ...(dataCpf || []),
      ].reduce<Atendimento[]>((acc, curr) => {
        if (!acc.some((item) => item.id === curr.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      if (combinedResults.length === 0) {
        setMensagem('Nenhum atendimento encontrado.');
      } else {
        setResultados(combinedResults);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setMensagem('Erro ao buscar atendimentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Cabeçalho */}
      <header className="header">
        <img src="/logoautismo.png" alt="Logo Sala Sensorial / ALECE" className="logo" />
        {isAuthenticated && (
          <div className="button-group">
            <button onClick={() => router.push('/dashboard')}>Dashboard</button>
            <button
              className="logout"
              onClick={async () => {
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                router.push('/');
              }}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Conteúdo Principal */}
      <main className="main">
        <h2>Consultar Atendimentos</h2>
        <div className="form">
          <div className="form-group">
            <label htmlFor="termoBusca">Nome ou CPF</label>
            <input
              type="text"
              id="termoBusca"
              placeholder="Digite o Nome ou CPF"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="button-group">
            <button onClick={buscarAtendimentos} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              className="cancel"
              onClick={() => router.push('/dashboard')}
              disabled={loading}
            >
              Voltar
            </button>
          </div>
        </div>

        {mensagem && (
          <p className={`message ${mensagem.includes('Erro') ? 'error' : 'info'}`}>
            {mensagem}
          </p>
        )}

        {resultados.length > 0 && (
          <div className="results">
            <h3>Resultados ({resultados.length})</h3>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Email</th>
                    <th>Data</th>
                    <th>Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((atendimento) => (
                    <tr key={atendimento.id}>
                      <td>{atendimento.nome}</td>
                      <td>{atendimento.cpf}</td>
                      <td>{atendimento.email}</td>
                      <td>
                        {atendimento.dia_atual
                          ? new Date(atendimento.dia_atual).toLocaleDateString('pt-BR')
                          : 'Data inválida'}
                      </td>
                      <td>{atendimento.horario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="footer">
        <p>© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
        <p>Entre em contato: (85) 2180-6587</p>
      </footer>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f3f4f6; /* Fundo claro como no CadastrarAtendimento */
        }

        .header {
          background-color: #008751;
          color: white;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
        }

        .logo {
          height: 60px;
          width: auto;
          object-fit: contain;
        }

        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .button-group button {
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

        .button-group button:hover {
          background: #1e3a8a;
        }

        .button-group .logout {
          background: #d9534f;
        }

        .button-group .logout:hover {
          background: #c9302c;
        }

        .main {
          max-width: 600px; /* Mesmo tamanho do CadastrarAtendimento */
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

        .main h3 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
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

        input:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
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

        .error {
          color: #d9534f;
        }

        .info {
          color: #6b7280;
        }

        .results {
          margin-top: 24px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          background-color: white;
          border-radius: 6px;
          overflow: hidden;
        }

        .table th,
        .table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .table th {
          background-color: #f3f4f6;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .table td {
          font-size: 14px;
          color: #6b7280;
        }

        .table tr:last-child td {
          border-bottom: none;
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

        .footer p + p {
          margin-top: 8px;
        }

        @media (max-width: 600px) {
          .header {
            flex-direction: column;
            gap: 10px;
            padding: 15px;
          }

          .logo {
            height: 50px;
          }

          .button-group {
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .button-group button {
            width: 100%;
          }

          .main {
            margin: 20px auto;
            padding: 16px;
          }

          .main h2 {
            font-size: 20px;
            margin-bottom: 16px;
          }

          .main h3 {
            font-size: 18px;
            margin-bottom: 12px;
          }

          .form {
            gap: 12px;
          }

          label {
            font-size: 14px;
          }

          input {
            font-size: 14px;
            padding: 8px;
          }

          button {
            padding: 10px 16px;
            font-size: 14px;
          }

          .table th,
          .table td {
            padding: 8px;
            font-size: 12px;
          }

          .footer {
            padding: 15px;
          }

          .footer p {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}