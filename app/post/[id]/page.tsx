'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Postagem {
  id: string;
  titulo: string;
  descricao: string;
  imagem_url: string;
  created_at: string;
  categoria: string;
  conteudo: string;
}

export default function PostPage({ params }: { params: { id: string } }) {
  const [postagem, setPostagem] = useState<Postagem | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPostagem = async () => {
      const { data, error } = await supabase
        .from('postagens')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Erro ao carregar postagem:', error);
        router.push('/');
      } else {
        setPostagem(data);
      }
      setLoading(false);
    };

    fetchPostagem();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!postagem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Postagem não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-4">
              <img 
                src="/logoautismo.png" 
                alt="Logo Sala Sensorial / ALECE" 
                className="h-16 w-auto object-contain" 
              />
              <h1 className="text-2xl font-bold text-gray-800">Sala Sensorial</h1>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="relative h-[400px]">
            <Image
              src={postagem.categoria === 'Notícias' ? '/placeholder1.jpg' : '/placeholder2.jpg'}
              alt={postagem.titulo}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <span className="inline-block px-4 py-2 text-sm font-semibold text-white bg-primary/90 rounded-full backdrop-blur-sm mb-4">
                {postagem.categoria}
              </span>
              <h1 className="text-4xl font-bold text-white mb-2">
                {postagem.titulo}
              </h1>
              <span className="text-white/80">
                {new Date(postagem.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          <div className="p-8">
            <div className="prose max-w-none text-gray-600">
              {postagem.conteudo.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-6 text-lg leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </article>

        <div className="mt-8 text-center">
          <Link 
            href="/"
            className="inline-flex items-center text-primary hover:text-primary-dark font-medium group"
          >
            <svg 
              className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 19l-7-7 7-7" 
              />
            </svg>
            Voltar para a página inicial
          </Link>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
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
} 