'use client';

import React, { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { useAuth } from '../../../../contexts/AuthContext';

interface Atendimento {
  id: string;
  nome: string;
  cpf: string;
  dia_atual: string;
  solicitante: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#1a365d',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
    color: '#1a365d',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
    color: '#4a5568',
  },
  dateInfo: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
    color: '#718096',
  },
  table: {
    width: '100%',
    marginTop: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 30,
  },
  tableCol: {
    width: '25%',
    padding: 8,
    fontSize: 10,
  },
  tableHeader: {
    backgroundColor: '#1a365d',
    color: 'white',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#718096',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
});

const RelatorioPDF = ({ atendimentos, dataInicio, dataFim, total }: { 
  atendimentos: Atendimento[], 
  dataInicio: string, 
  dataFim: string,
  total: number
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório de Atendimentos</Text>
          <Text style={styles.subtitle}>Sistema de Gestão de Atendimentos</Text>
          <Text style={styles.dateInfo}>
            Período: {formatDate(dataInicio)} a {formatDate(dataFim)}
          </Text>
          <Text style={styles.subtitle}>Total de registros: {total}</Text>
        </View>
        
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCol}>Nome</Text>
            <Text style={styles.tableCol}>CPF</Text>
            <Text style={styles.tableCol}>Data</Text>
            <Text style={styles.tableCol}>Solicitante</Text>
          </View>
          {atendimentos.map((atendimento) => (
            <View key={atendimento.id} style={styles.tableRow}>
              <Text style={styles.tableCol}>{atendimento.nome}</Text>
              <Text style={styles.tableCol}>{atendimento.cpf}</Text>
              <Text style={styles.tableCol}>{formatDate(atendimento.dia_atual)}</Text>
              <Text style={styles.tableCol}>{atendimento.solicitante}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>Gerado em {formatDate(new Date().toISOString())} às {new Date().toLocaleTimeString('pt-BR')}</Text>
          <Text>Página 1 de 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export default function GerarRelatorioPage() {
  const { user } = useAuth();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('id, nome, cpf, dia_atual, solicitante')
        .gte('dia_atual', dataInicio)
        .lte('dia_atual', dataFim)
        .order('dia_atual', { ascending: true });

      if (error) throw error;
      setAtendimentos(data || []);
    } catch (err) {
      setError('Erro ao buscar atendimentos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Gerar Relatório</h1>
            <Link
              href="/dashboard/relatorios"
              className="text-gray-600 hover:text-gray-900"
            >
              Voltar
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700">
                  Data Início
                </label>
                <input
                  type="date"
                  name="dataInicio"
                  id="dataInicio"
                  required
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700">
                  Data Fim
                </label>
                <input
                  type="date"
                  name="dataFim"
                  id="dataFim"
                  required
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href="/dashboard/relatorios"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Buscar Atendimentos'}
              </button>
            </div>
          </form>

          {atendimentos.length > 0 && (
            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end">
                <PDFDownloadLink
                  document={
                    <RelatorioPDF
                      atendimentos={atendimentos}
                      dataInicio={dataInicio}
                      dataFim={dataFim}
                      total={atendimentos.length}
                    />
                  }
                  fileName={`relatorio-atendimentos-${dataInicio}-${dataFim}.pdf`}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {({ loading }) => (loading ? 'Gerando PDF...' : 'Download PDF')}
                </PDFDownloadLink>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 