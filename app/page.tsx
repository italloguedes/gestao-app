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
            <button onClick={() => router.push('/dashboard')}>Painel de Controle</button>
            <button
              className="logout"
              onClick={async () => {
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                router.push('/');
              }}
            >
              Deslogar
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
    background: #f8f9fa;
  }

  .header {
    background: linear-gradient(135deg, #008751 0%, #006B40 100%);
    color: white;
    padding: 20px 40px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
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
    transition: transform 0.3s ease;
  }

  .logo:hover {
    transform: scale(1.05);
  }

  .login-form {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .login-form input {
    width: 220px;
  }

  .button-group {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .button-group button,
  .login-form button {
    background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
  }

  .button-group .logout {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  }

  .main {
    flex: 1;
    padding: 20px;
    animation: fadeIn 0.8s ease-out;
  }

  .main h2 {
    font-size: 32px;
    font-weight: 800;
    color: #008751;
    text-align: center;
    margin: 40px 0;
    position: relative;
    padding-bottom: 15px;
  }

  .main h2:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 4px;
    background: linear-gradient(90deg, #008751, #00b76a);
    border-radius: 2px;
  }

  .postagem-card {
    background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
    border-radius: 16px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: all 0.3s ease;
    margin: 15px;
    height: 100%;
  }

  .postagem-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.15);
  }

  .postagem-card img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .postagem-card:hover img {
    transform: scale(1.05);
  }

  .postagem-content {
    padding: 25px;
  }

  .postagem-content h3 {
    font-size: 24px;
    color: #1a1a1a;
    margin-bottom: 15px;
    font-weight: 700;
  }

  .postagem-content .descricao {
    color: #4b5563;
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 16px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .postagem-content .data {
    font-size: 14px;
    color: #6b7280;
  }

  .no-postagens {
    text-align: center;
    color: #6b7280;
    font-size: 18px;
    padding: 40px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .footer {
    background: linear-gradient(135deg, #008751 0%, #006B40 100%);
    color: rgba(255, 255, 255, 0.9);
    padding: 30px 20px;
    text-align: center;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  }

  .footer p {
    font-size: 15px;
    line-height: 1.6;
    letter-spacing: 0.5px;
    margin: 5px 0;
  }

  /* Estilização dos pontos de navegação do carrossel */
  :global(.slick-dots li button:before) {
    color: #008751;
    font-size: 12px;
  }

  :global(.slick-dots li.slick-active button:before) {
    color: #006B40;
  }

  :global(.slick-prev),
  :global(.slick-next) {
    z-index: 1;
  }

  :global(.slick-prev:before),
  :global(.slick-next:before) {
    color: #008751;
    font-size: 24px;
  }

  /* Ajustes para dispositivos móveis */
  @media (max-width: 600px) {
    .header {
      padding: 15px;
      flex-direction: column;
      gap: 15px;
    }

    .logo {
      height: 45px;
    }

    .login-form {
      flex-direction: column;
      width: 100%;
    }

    .login-form input {
      width: 100%;
    }

    .button-group {
      flex-direction: column;
      width: 100%;
    }

    .button-group button {
      width: 100%;
    }

    .main {
      padding: 15px;
    }

    .main h2 {
      font-size: 24px;
      margin: 20px 0;
    }

    .postagem-content {
      padding: 15px;
    }

    .postagem-content h3 {
      font-size: 20px;
    }

    .footer {
      padding: 20px 15px;
    }
  }
`}</style>
    </div>
  );
}