'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import Slider from 'react-slick'; // Importa o carrossel
import 'slick-carousel/slick/slick.css'; // Estilos do carrossel
import 'slick-carousel/slick/slick-theme.css'; // Tema do carrossel

interface Postagem {
  id: string;
  titulo: string;
  descricao: string;
  imagem_url: string;
  created_at: string;
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [postagens, setPostagens] = useState<Postagem[]>([]);
  const router = useRouter();

  // Carrega as postagens e verifica autenticação (apenas para exibir botões de login/logout)
  useEffect(() => {
    const fetchSessionAndPosts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setIsAuthenticated(true);

      // Carrega as postagens independentemente da autenticação
      const { data, error } = await supabase
        .from('postagens')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao carregar postagens:', error);
      } else {
        setPostagens(data || []);
      }
    };
    fetchSessionAndPosts();

    // Efeito de mudança de cor no fundo
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
  }, []);

  // Função de login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert('Erro ao fazer login: ' + error.message);
    } else {
      setIsAuthenticated(true);
      router.push('/dashboard');
    }
  };

  // Configurações do carrossel
  const settings = {
    dots: true, // Mostra os pontos de navegação
    infinite: true, // Loop infinito
    speed: 500, // Velocidade da transição
    slidesToShow: 3, // Quantidade de slides visíveis (web)
    slidesToScroll: 1, // Quantidade de slides para rolar por vez
    autoplay: true, // Ativa o autoplay
    autoplaySpeed: 3000, // Tempo entre transições (3 segundos)
    vertical: false, // Garante que o carrossel seja horizontal
    verticalSwiping: false, // Desativa o swipe vertical
    responsive: [
      {
        breakpoint: 1024, // Para telas menores que 1024px (tablets)
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 600, // Para telas menores que 600px (mobile)
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          dots: true, // Mantém os pontos de navegação no mobile
        },
      },
    ],
  };

  return (
    <div className="container">
      {/* Cabeçalho */}
      <header className="header">
        <img src="/logoautismo.png" alt="Logo Sala Sensorial / ALECE" className="logo" />
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Login</button>
          </form>
        ) : (
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
        <h2>Últimas Notícias</h2>
        {postagens.length > 0 ? (
          <Slider {...settings}>
            {postagens.map((postagem) => (
              <div key={postagem.id} className="postagem-card">
                <img src={postagem.imagem_url} alt={postagem.titulo} />
                <div className="postagem-content">
                  <h3>{postagem.titulo}</h3>
                  <p className="descricao">{postagem.descricao}</p>
                  <p className="data">
                    Publicado em {new Date(postagem.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </Slider>
        ) : (
          <p className="no-postagens">Nenhuma postagem disponível no momento.</p>
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
          background: #f3f4f6; /* Fundo claro */
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
          flex-wrap: wrap; /* Permite que o header quebre em mobile */
          padding: 12px 20px;
        }

        .logo {
          height: 100px; /* Aumenta a altura da logo para telas grandes */
          width: auto; /* Mantém a proporção da imagem */
          object-fit: contain; /* Garante que a logo não seja distorcida */
        }

        .login-form {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap; /* Permite que os inputs quebrem em mobile */
        }

        .login-form input {
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
          background-color: #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          outline: none;
          font-size: 14px;
          width: 100%; /* Inputs ocupam 100% da largura em mobile */
          max-width: 200px; /* Limita a largura em telas maiores */
        }

        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap; /* Permite que os botões quebrem em mobile */
        }

        .button-group button,
        .login-form button {
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

        .button-group button:hover,
        .login-form button:hover {
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
        }

        .main h2 {
          font-size: 24px;
          font-weight: 700;
          color: #008751;
          text-align: center;
          margin-bottom: 32px;
        }

        .postagem-card {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: transform 0.3s;
          margin: 0 10px; /* Espaçamento entre os slides */
          width: 100%; /* Garante que o card ocupe o espaço disponível */
        }

        .postagem-card:hover {
          transform: translateY(-5px);
        }

        .postagem-card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }

        .postagem-content {
          padding: 20px;
        }

        .postagem-content h3 {
          font-size: 22px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 12px;
        }

        .postagem-content .descricao {
          color: #6b7280;
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 16px;
          max-height: 72px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .postagem-content .data {
          font-size: 14px;
          color: #9ca3af;
        }

        .no-postagens {
          text-align: center;
          color: #6b7280;
          font-size: 18px;
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

        /* Estilização dos pontos de navegação do carrossel */
        .slick-dots li button:before {
          color: #008751;
        }

        .slick-dots li.slick-active button:before {
          color: #00663d;
        }

        /* Garante que o carrossel seja horizontal */
        .slick-track {
          display: flex !important;
          flex-direction: row !important;
        }

        .slick-slide {
          height: auto !important;
        }

        /* Ajustes para dispositivos móveis */
        @media (max-width: 600px) {
          .header {
            flex-direction: column;
            gap: 10px;
            padding: 10px;
          }

          .logo {
            height: 40px; /* Aumenta a altura da logo para mobile */
          }

          .login-form {
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .login-form input {
            max-width: 100%;
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

          .main h2 {
            font-size: 20px;
            margin-bottom: 20px;
          }

          .postagem-card img {
            height: 150px; /* Reduz a altura da imagem no mobile */
          }

          .postagem-content {
            padding: 15px;
          }

          .postagem-content h3 {
            font-size: 18px;
          }

          .postagem-content .descricao {
            font-size: 14px;
            max-height: 60px;
          }

          .postagem-content .data {
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