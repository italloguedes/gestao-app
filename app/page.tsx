'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Postagem {
  id: string;
  titulo: string;
  descricao: string;
  imagem_url: string;
  created_at: string;
  categoria: string;
}

const Home: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [postagens, setPostagens] = useState<Postagem[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todas');
  const [tempoRestante, setTempoRestante] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const fetchSessionAndPosts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.expires_at) {
        setIsAuthenticated(true);
        // Inicia o timer quando o usuário está autenticado
        iniciarTimer(session.expires_at);
      }

      const { data, error } = await supabase
        .from('postagens')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao carregar postagens:', error);
      } else {
        setPostagens(data || []);
        // Extrai categorias únicas
        const cats = [...new Set(data?.map(post => post.categoria) || [])];
        setCategorias(cats);
      }
    };
    fetchSessionAndPosts();
  }, []);

  const iniciarTimer = (expiresAt: number) => {
    const atualizarTimer = () => {
      const agora = Math.floor(Date.now() / 1000);
      const tempoRestanteSegundos = expiresAt - agora;
      
      if (tempoRestanteSegundos <= 0) {
        // Sessão expirada
        supabase.auth.signOut();
        setIsAuthenticated(false);
        setTempoRestante('');
        return;
      }

      const horas = Math.floor(tempoRestanteSegundos / 3600);
      const minutos = Math.floor((tempoRestanteSegundos % 3600) / 60);
      const segundos = tempoRestanteSegundos % 60;

      setTempoRestante(`${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`);
    };

    // Atualiza o timer a cada segundo
    const timerId = setInterval(atualizarTimer, 1000);
    atualizarTimer(); // Atualiza imediatamente

    // Limpa o timer quando o componente é desmontado
    return () => clearInterval(timerId);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert('Erro ao fazer login: ' + error.message);
    } else if (data.session && data.session.expires_at) {
      setIsAuthenticated(true);
      iniciarTimer(data.session.expires_at);
      router.push('/dashboard');
    }
  };

  const postagensFiltradas = categoriaSelecionada === 'todas'
    ? postagens
    : postagens.filter(post => post.categoria === categoriaSelecionada);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Cabeçalho */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img 
                src="/logoautismo.png" 
                alt="Logo Sala Sensorial / ALECE" 
                className="h-16 w-auto object-contain" 
              />
              <h1 className="text-2xl font-bold text-gray-800">Sala Sensorial</h1>
            </div>
            
            {!isAuthenticated ? (
              <form onSubmit={handleLogin} className="hidden md:flex items-center space-x-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input"
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input"
                />
                <button type="submit" className="btn-primary">Login</button>
              </form>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
                  <svg 
                    className="w-5 h-5 text-gray-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    Sessão expira em: {tempoRestante}
                  </span>
                </div>
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="btn-secondary"
                >
                  Painel de Controle
                </button>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsAuthenticated(false);
                    setTempoRestante('');
                    router.push('/');
                  }}
                  className="btn-danger"
                >
                  Deslogar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Banner Principal */}
        <div className="relative h-[500px] mb-16 rounded-2xl overflow-hidden shadow-xl">
          <Image
            src="/logoautismo.png"
            alt="Banner Principal"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-center">
            <div className="max-w-2xl px-8">
              <h2 className="text-5xl font-bold text-white mb-6">Bem-vindo à Sala Sensorial</h2>
              <p className="text-xl text-white/90">Promovendo inclusão e acessibilidade para todos</p>
            </div>
          </div>
        </div>

        {/* Categorias */}
        <div className="mb-12 flex flex-wrap gap-3">
          <button
            key="todas"
            onClick={() => setCategoriaSelecionada('todas')}
            className={`px-6 py-3 rounded-full transition-all duration-300 ${
              categoriaSelecionada === 'todas'
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
            }`}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={`cat-${cat}`}
              onClick={() => setCategoriaSelecionada(cat)}
              className={`px-6 py-3 rounded-full transition-all duration-300 ${
                categoriaSelecionada === cat
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de Postagens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {postagensFiltradas.map((postagem) => (
            <article 
              key={postagem.id} 
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group"
            >
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={postagem.categoria === 'Notícias' ? '/placeholder1.jpg' : '/placeholder2.jpg'}
                  alt={postagem.titulo}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute top-4 right-4 px-3 py-1 text-sm font-semibold text-white bg-primary/90 rounded-full backdrop-blur-sm">
                  {postagem.categoria}
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-primary transition-colors">
                  {postagem.titulo}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {postagem.descricao}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {new Date(postagem.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <Link
                    href={`/post/${postagem.id}`}
                    className="inline-flex items-center text-primary hover:text-primary-dark font-medium group-hover:translate-x-1 transition-transform"
                  >
                    Ler mais
                    <svg 
                      className="w-4 h-4 ml-1" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {postagensFiltradas.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg 
                className="w-8 h-8 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">
              Nenhuma postagem disponível nesta categoria.
            </p>
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Sala Sensorial</h3>
              <p className="text-gray-400">
                Promovendo inclusão e acessibilidade para pessoas com autismo.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contato</h3>
              <p className="text-gray-400">
                Telefone: (85) 2180-6587<br />
                Email: contato@salasensorial.com.br
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Localização</h3>
              <p className="text-gray-400">
                Prédio da Assembleia Legislativa<br />
                Anexo III, Sala Sensorial<br />
                Fortaleza - CE
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;