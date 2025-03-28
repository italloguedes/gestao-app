'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert('Erro ao fazer login: ' + error.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      {/* Cabeçalho com formulário de login */}
      <header style={{ backgroundColor: '#008751', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Sala Sensorial / ALECE</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: 'none', outline: 'none', boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.1)' }}
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: 'none', outline: 'none', boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.1)' }}
              required
            />
            <button
              type="submit"
              style={{ padding: '8px 16px', backgroundColor: '#1e40af', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
            >
              Login
            </button>
          </form>
        </div>
      </header>

      {/* Seção de notícias */}
      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', padding: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '600', color: '#1f2937', marginBottom: '24px' }}>Últimas Notícias</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Card de Notícia 1 */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <img
              src="/placeholder1.jpg"
              alt="Foto 1"
              style={{ width: '100%', height: '192px', objectFit: 'cover' }}
            />
            <div style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Identidade nova é na Sala Sensorial!!
              </h3>
              <p style={{ color: '#4b5563', marginBottom: '16px' }}>
              A Sala Sensorial é um ambiente projetado para proporcionar conforto, acessibilidade e bem-estar a crianças e adolescentes com autismo, síndrome de Down e outras condições atípicas. O espaço foi cuidadosamente desenvolvido para oferecer um atendimento mais humanizado, reduzindo estímulos sensoriais excessivos e promovendo uma experiência tranquila e segura.

Nosso atendimento é prioritário para a emissão da nova Carteira de Identidade Nacional (CIN), garantindo que cada indivíduo receba o suporte necessário durante o processo, respeitando suas necessidades e proporcionando um ambiente acolhedor.

Com uma equipe capacitada e um ambiente adaptado, a Sala Sensorial reforça o compromisso com a inclusão e o respeito às diferenças, garantindo um atendimento digno e acessível a todos..
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Publicado em 28 de março de 2025</p>
            </div>
          </div>

          {/* Card de Notícia 2 */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <img
              src="/placeholder2.jpg"
              alt="Foto 2"
              style={{ width: '100%', height: '192px', objectFit: 'cover' }}
            />
            <div style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                CIADI e ALECE Juntos
              </h3>
              <p style={{ color: '#4b5563', marginBottom: '16px' }}>
                A Sala Sensorial é um projeto da ALECE para promover a inclusão e acessibilidade.
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Publicado em 28 de março de 2025</p>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer style={{ backgroundColor: '#1f2937', color: 'white', padding: '16px', textAlign: 'center' }}>
        <p>© 2025 Sala Sensorial - ALECE. Todos os direitos reservados.</p>
        <p style={{ marginTop: '8px' }}>
          Entre em contato: (85) 2180-6587 |{' '}
        </p>
      </footer>
    </div>
  );
}