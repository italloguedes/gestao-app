'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Definição do tipo para os dados de atendimento
interface Atendimento {
  id: string
  nome: string
  cpf: string
  dia_atual: string
  solicitante: string
  email?: string // Opcional, caso esteja presente em alguns registros
}

const ConsultaAtendimento = () => {
  const [termoBusca, setTermoBusca] = useState('')
  const [resultados, setResultados] = useState<Atendimento[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const formatarCPF = (cpf: string) => {
    return cpf.replace(/\D/g, '') // Remove tudo que não for número
  }

  const buscarAtendimentos = async () => {
    const termoFormatado = formatarCPF(termoBusca).trim()

    if (!termoBusca) {
      setErro('Digite um nome ou CPF válido para buscar.')
      return
    }

    setCarregando(true)
    setErro(null)
    setResultados([])

    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .or(
          `cpf.ilike.%${termoFormatado}%,nome.ilike.%${termoBusca}%`
        )

      if (error) {
        throw new Error(error.message)
      }

      if (!data || data.length === 0) {
        setErro('Nenhum atendimento encontrado.')
      } else {
        setResultados(data)
      }
    } catch (err) {
      setErro('Erro ao buscar atendimentos. Tente novamente.')
    }

    setCarregando(false)
  }

  return (
      <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Consultar Atendimento</h1>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Digite o Nome ou CPF"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <button
          onClick={buscarAtendimentos}
          disabled={carregando}
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {carregando ? 'Buscando...' : 'Buscar'}
        </button>

        {erro && <p className="text-red-500 mt-4">{erro}</p>}

        {resultados.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Resultados:</h2>
            <ul className="border border-gray-300 rounded p-4">
              {resultados.map((atendimento) => (
                <li key={atendimento.id} className="border-b py-2">
                  <p><strong>Nome:</strong> {atendimento.nome}</p>
                  <p><strong>CPF:</strong> {atendimento.cpf}</p>
                  <p><strong>Data:</strong> {new Date(atendimento.dia_atual).toLocaleDateString()}</p>
                  <p><strong>Solicitante:</strong> {atendimento.solicitante}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
  )
}

export default ConsultaAtendimento
