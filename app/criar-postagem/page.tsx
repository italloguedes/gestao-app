'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function CriarPostagem() {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/');
    };
    checkUser();
  }, [router]);

  const handlePostagem = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('postagens')
      .insert({
        titulo,
        descricao,
        imagem_url: imagemUrl,
        usuario_id: (await supabase.auth.getSession()).data.session?.user.id,
      });
    if (error) {
      alert('Erro ao criar postagem: ' + error.message);
    } else {
      alert('Postagem criada com sucesso!');
      setTitulo('');
      setDescricao('');
      setImagemUrl('');
      router.push('/dashboard');
    }
  };

  return (
    <div className="container">
      <h1>Criar Nova Postagem</h1>
      <form onSubmit={handlePostagem} className="form">
        <div className="form-group">
          <label htmlFor="titulo">Título</label>
          <input
            type="text"
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="descricao">Descrição</label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="imagemUrl">URL da Imagem</label>
          <input
            type="text"
            id="imagemUrl"
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
            required
          />
        </div>
        <div className="button-group">
          <button type="submit">Publicar</button>
          <button type="button" className="cancel" onClick={() => router.push('/dashboard')}>
            Cancelar
          </button>
        </div>
      </form>

      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          background: #f3f4f6;
          border-radius: 10px;
          box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        }

        h1 {
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

        input,
        textarea {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #d1d5db;
          border-radius: 5px;
          outline: none;
          transition: border-color 0.3s;
        }

        input:focus,
        textarea:focus {
          border-color: #008751;
        }

        textarea {
          min-height: 120px;
          resize: vertical;
        }

        .button-group {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        button {
          background: #008751;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s ease-in-out;
        }

        button:hover {
          background: #00663d;
        }

        .cancel {
          background: #d9534f;
        }

        .cancel:hover {
          background: #c9302c;
        }
      `}</style>
    </div>
  );
}