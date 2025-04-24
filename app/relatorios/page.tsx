'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Tipo para os atendimentos
interface Atendimento {
  id: string;
  nome: string;
  cpf: string;
  solicitante: string;
  dia_atual: string;
  usuario_id: string;
}

export default function Relatorios() {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [resultados, setResultados] = useState<Atendimento[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Pega o ID do usuário logado e verifica autenticação
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redireciona se não estiver logado
      } else {
        setUserId(session.user.id);
        setIsAuthenticated(true);
        console.log('Usuário logado, ID:', session.user.id);
      }
    };
    fetchUser();

    // Efeito de mudança de cor no fundo (consistente com a página inicial)
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

  // Função para buscar atendimentos
  const buscarAtendimentos = async () => {
    if (!userId) {
      setMensagem('Usuário não carregado ainda. Tente novamente.');
      return;
    }

    setMensagem(null);
    setResultados([]);
    setLoading(true);

    if (!dataInicio || !dataFim) {
      setMensagem('Selecione as datas inicial e final.');
      setLoading(false);
      return;
    }

    // Garante que as datas estejam no formato correto (YYYY-MM-DD)
    const dataInicioFormatted = `${dataInicio}T00:00:00.000Z`;
    const dataFimFormatted = `${dataFim}T23:59:59.999Z`;

    console.log('Buscando atendimentos...');
    console.log('Data Início:', dataInicioFormatted);
    console.log('Data Fim:', dataFimFormatted);
    console.log('Usuário ID:', userId);

    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('id, nome, cpf, solicitante, dia_atual, usuario_id')
        .eq('usuario_id', userId)
        .gte('dia_atual', dataInicioFormatted)
        .lte('dia_atual', dataFimFormatted)
        .order('dia_atual', { ascending: true });

      if (error) {
        console.error('Erro na consulta ao Supabase:', error);
        setMensagem('Erro ao buscar atendimentos: ' + error.message);
        setLoading(false);
        return;
      }

      console.log('Dados retornados:', data);

      if (!data || data.length === 0) {
        setMensagem('Nenhum atendimento encontrado para o período selecionado.');
      } else {
        setResultados(data);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setMensagem('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Cabeçalho */}
      <header className="header">
        <Image 
          src="/logoautismo.png" 
          alt="Logo Sala Sensorial / ALECE" 
          className="logo" 
          width={200}
          height={60}
          priority
        />
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
        <div className="relatorios-container">
          <h1 className="title">Relatórios</h1>

          <div className="form-grid">
            <div>
              <label className="label">Data Inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="input"
                disabled={loading}
              />
            </div>
            <div>
              <label className="label">Data Final</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="input"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={buscarAtendimentos}
            className="button-primary"
            disabled={loading}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>

          {mensagem && (
            <p className="error-message">{mensagem}</p>
          )}

          {resultados.length > 0 && (
            <div className="results">
              <h2 className="subtitle">
                Resultados ({resultados.length})
              </h2>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>CPF</th>
                      <th>Solicitante</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((atendimento) => (
                      <tr key={atendimento.id}>
                        <td>{atendimento.nome}</td>
                        <td>{atendimento.cpf}</td>
                        <td>{atendimento.solicitante}</td>
                        <td>
                          {atendimento.dia_atual
                            ? new Date(atendimento.dia_atual).toLocaleDateString('pt-BR')
                            : 'Data inválida'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className="button-secondary"
            disabled={loading}
          >
            Voltar
          </button>
        </div>
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
          background: #f3f4f6;
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
          padding: 8px 20px;
          background-color: #1e40af;
          color: white;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background-color 0.3s;
        }

        .button-group button:hover {
          background-color: #1e3a8a;
        }

        .button-group .logout {
          background-color: #d9534f;
        }

        .button-group .logout:hover {
          background-color: #c9302c;
        }

        .main {
          flex: 1;
          padding: 20px;
          display: flex;
          justify-content: center;
        }

        .relatorios-container {
          max-width: 800px;
          width: 100%;
          background: white;
          padding: 24px;
          border-radius: 10px;
          box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        }

        .title {
          font-size: 24px;
          font-weight: 700;
          color: #008751;
          text-align: center;
          margin-bottom: 24px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          margin-bottom: 8px;
        }

        .input {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          color: #111827;
          background-color: #fff;
          transition: border-color 0.3s;
        }

        .input:focus {
          outline: none;
          border-color: #008751;
        }

        .input:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
        }

        .button-primary {
          width: 100%;
          padding: 12px;
          background-color: #008751;
          color: white;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: background-color 0.3s;
        }

        .button-primary:hover {
          background-color: #00663d;
        }

        .button-primary:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .button-secondary {
          width: 100%;
          padding: 12px;
          background-color: #6b7280;
          color: white;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: background-color 0.3s;
          margin-top: 24px;
        }

        .button-secondary:hover {
          background-color: #4b5563;
        }

        .button-secondary:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .error-message {
          margin-top: 16px;
          text-align: center;
          color: #d9534f;
          font-size: 16px;
        }

        .results {
          margin-top: 24px;
        }

        .subtitle {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
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
            padding: 10px;
          }

          .relatorios-container {
            padding: 16px;
          }

          .title {
            font-size: 20px;
            margin-bottom: 16px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 16px;
          }

          .subtitle {
            font-size: 18px;
            margin-bottom: 12px;
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