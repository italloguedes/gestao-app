'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';

// Definição do tipo para os dados de atendimento
interface Atendimento {
  id: string;
  nome: string;
  cpf: string;
  solicitante?: string; // Opcional, caso a coluna exista
  dia_atual: string;
  created_at: string;
  updated_at: string;
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

  // Obtém o ID do usuário logado
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redireciona para a página de login se não estiver logado
      } else {
        setUserId(session.user.id);
        console.log('ID do usuário logado:', session.user.id);
      }
    };
    fetchUser();
  }, [router]);

  const buscarAtendimentos = async () => {
    setMensagem(null);
    setResultados([]);
    setLoading(true);

    if (!userId) {
      setMensagem('Usuário não autenticado. Por favor, faça login novamente.');
      setLoading(false);
      return;
    }

    if (!dataInicio || !dataFim) {
      setMensagem('Por favor, selecione as datas inicial e final.');
      setLoading(false);
      return;
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    if (inicio > fim) {
      setMensagem('A data inicial não pode ser maior que a data final.');
      setLoading(false);
      return;
    }

    try {
      console.log('Buscando atendimentos com os seguintes parâmetros:');
      console.log('usuario_id:', userId);
      console.log('dataInicio:', dataInicio);
      console.log('dataFim:', dataFim);

      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('usuario_id', userId) // Filtra pelos atendimentos do usuário logado
        .gte('dia_atual', dataInicio) // Greater than or equal to dataInicio
        .lte('dia_atual', dataFim) // Less than or equal to dataFim
        .order('dia_atual', { ascending: true }); // Ordena por dia_atual em ordem crescente

      console.log('Dados retornados:', data);
      console.log('Erro:', error);

      if (error) {
        setMensagem('Erro ao buscar atendimentos: ' + error.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setMensagem('Nenhum atendimento encontrado no intervalo de datas.');
        setLoading(false);
        return;
      }

      setResultados(data);
    } catch (err) {
      console.error('Erro inesperado:', err);
      setMensagem('Erro ao buscar atendimentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const gerarPDF = () => {
    if (resultados.length === 0) {
      setMensagem('Nenhum dado para gerar o PDF.');
      return;
    }

    const doc = new jsPDF();
    const dataInicioFormatada = new Date(dataInicio).toLocaleDateString('pt-BR');
    const dataFimFormatada = new Date(dataFim).toLocaleDateString('pt-BR');

    // Título do PDF
    doc.setFontSize(16);
    doc.text(
      `Relatório de Atendimentos ${dataInicioFormatada} a ${dataFimFormatada}`,
      14,
      20
    );

    // Quantidade total de atendimentos
    doc.setFontSize(12);
    doc.text(`Total de Atendimentos: ${resultados.length}`, 14, 30);

    // Cabeçalho da tabela
    doc.setFontSize(10);
    let currentY = 40;
    const colWidths = [50, 40, 40, 30]; // Larguras das colunas
    const headers = ['Nome', 'CPF', 'Solicitante', 'Data'];
    const pageHeight = 270; // Altura aproximada da página A4 (em mm)

    // Desenha o cabeçalho
    const drawHeader = () => {
      doc.setFillColor(50, 50, 50); // Cor de fundo do cabeçalho (cinza escuro)
      doc.setTextColor(255, 255, 255); // Texto branco
      let currentX = 14;
      headers.forEach((header, index) => {
        doc.rect(currentX, currentY, colWidths[index], 10, 'F'); // Desenha o retângulo preenchido
        doc.text(header, currentX + 2, currentY + 7); // Adiciona o texto
        currentX += colWidths[index];
      });
      currentY += 10;
    };

    drawHeader();

    // Linhas da tabela
    doc.setTextColor(0, 0, 0); // Texto preto para as linhas
    resultados.forEach((atendimento, index) => {
      // Verifica se precisa de uma nova página
      if (currentY + 10 > pageHeight) {
        doc.addPage();
        currentY = 20;
        drawHeader();
      }

      const rowY = currentY;
      let currentX = 14;

      // Fundo alternado
      if (index % 2 === 0) {
        doc.setFillColor(240, 240, 240); // Cinza claro
        doc.rect(14, rowY, 160, 10, 'F'); // Preenche a linha (160 é a soma das larguras)
      }

      // Dados da linha
      const rowData = [
        atendimento.nome,
        atendimento.cpf,
        atendimento.solicitante || 'N/A',
        new Date(atendimento.dia_atual).toLocaleDateString('pt-BR'),
      ];

      // Desenha a linha
      rowData.forEach((cell, colIndex) => {
        // Trunca o texto se for muito longo
        const maxWidth = colWidths[colIndex] - 4;
        let text = cell;
        if (doc.getTextWidth(text) > maxWidth) {
          while (doc.getTextWidth(text + '...') > maxWidth) {
            text = text.slice(0, -1);
          }
          text += '...';
        }

        doc.text(text, currentX + 2, rowY + 7);
        doc.rect(currentX, rowY, colWidths[colIndex], 10); // Desenha a borda da célula
        currentX += colWidths[colIndex];
      });

      currentY += 10;
    });

    // Salva o PDF
    doc.save(`Relatorio_Atendimentos_${dataInicio}_a_${dataFim}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-gray-900 fixed top-0 left-0 w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <h1 className="text-lg font-medium text-white">
                Gestão de Atendimentos e CIN - Sala Sensorial
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/consultar-atendimentos')}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Consulta
              </button>
              <button
                onClick={() => router.push('/cadastrar-atendimento')}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Cadastro de Atendimento
              </button>
              <button
                onClick={() => router.push('/cadastrar-cin')}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Cadastro CINS
              </button>
              <button
                onClick={() => router.push('/relatorios')}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Relatórios
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/');
                }}
                className="px-3 py-1 text-white border border-white rounded-full hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo da página */}
      <div className="pt-20 px-4">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Relatórios</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data Final
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={buscarAtendimentos}
              className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              onClick={gerarPDF}
              className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-green-300"
              disabled={resultados.length === 0 || loading}
            >
              Gerar PDF
            </button>
          </div>

          {mensagem && (
            <p
              className={`mt-4 ${
                mensagem.includes('Erro') ? 'text-red-500' : 'text-gray-700'
              }`}
            >
              {mensagem}
            </p>
          )}

          {resultados.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-2">
                Resultados ({resultados.length} atendimentos)
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="p-3 text-left border-b">Nome</th>
                      <th className="p-3 text-left border-b">CPF</th>
                      <th className="p-3 text-left border-b">Solicitante</th>
                      <th className="p-3 text-left border-b">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((atendimento, index) => (
                      <tr
                        key={atendimento.id}
                        className={`border-b ${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-gray-100`}
                      >
                        <td className="p-3">{atendimento.nome}</td>
                        <td className="p-3">{atendimento.cpf}</td>
                        <td className="p-3">
                          {atendimento.solicitante || 'N/A'}
                        </td>
                        <td className="p-3">
                          {new Date(atendimento.dia_atual).toLocaleDateString(
                            'pt-BR'
                          )}
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
            className="mt-4 w-full p-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}