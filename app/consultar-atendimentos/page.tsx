'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

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
  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState<Atendimento[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  

  const buscarAtendimentos = async () => {
    setMensagem(null);
    setResultados([]);

    if (!termoBusca.trim()) {
      setMensagem('Por favor, digite um nome ou CPF para buscar.');
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
        return;
      }

      setResultados(combinedResults);
    } catch (err) {
      console.error('Erro inesperado:', err);
      setMensagem('Erro ao buscar atendimentos. Tente novamente.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Consultar Atendimentos</h1>

      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="Digite o Nome ou CPF"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <button
          onClick={buscarAtendimentos}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
          }}
        >
          Buscar
        </button>
        <button
          onClick={() => ('/dashboard')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
          }}
        >
          Voltar
        </button>

      </div>

      {mensagem && (
        <p
          style={{
            color: mensagem.includes('Erro') ? 'red' : 'black',
            marginBottom: '15px',
          }}
        >
          {mensagem}
        </p>
      )}

      {resultados.length > 0 && (
        <div>
          <h2>Resultados:</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {resultados.map((atendimento) => (
              <li
                key={atendimento.id}
                style={{ borderBottom: '1px solid #ccc', padding: '10px 0' }}
              >
                <p>
                  <strong>Nome:</strong> {atendimento.nome}
                </p>
                <p>
                  <strong>CPF:</strong> {atendimento.cpf}
                </p>
                <p>
                  <strong>Email:</strong> {atendimento.email}
                </p>
                <p>
                  <strong>Data:</strong> {atendimento.dia_atual}
                </p>
                <p>
                  <strong>Horário:</strong> {atendimento.horario}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}